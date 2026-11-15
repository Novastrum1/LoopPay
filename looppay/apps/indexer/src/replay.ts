import { PrismaClient } from "@prisma/client";
import { createPublicClient, http } from "viem";
import { loadNetwork } from "@looppay/config";
import { project } from "./project";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(new URL("../../../.env.local", import.meta.url));
} catch {
  try {
    loadEnvFile(new URL("../../../.env", import.meta.url));
  } catch {
    /* environment may be supplied */
  }
}
const db = new PrismaClient();
try {
  if (!process.argv.includes("--confirm-rebuild-projections"))
    throw Error("Confirmation required");
  const input = process.argv
    .find((arg) => arg.startsWith("--from-block="))
    ?.split("=")[1];
  if (!input || !/^\d+$/.test(input)) throw Error("Specify replay boundary");
  const from = BigInt(input);
  const start = BigInt(process.env.DEPLOYMENT_BLOCK ?? "-1");
  const n = loadNetwork(process.env);
  const client = createPublicClient({
    transport: http(process.env.QIE_RPC_URL || n.rpcUrl, { retryCount: 0 }),
  });
  if ((await client.getChainId()) !== n.chainId || start < 0n || from < start)
    throw Error("Network or boundary mismatch");
  const identity = `${n.chainId}:${[n.registry, n.checkout, n.rewards].join(":")}`;
  const checkpoints = await db.checkpoint.findMany();
  if (
    checkpoints.length > 1 ||
    checkpoints.some((c) => c.id !== identity || from > c.block + 1n)
  )
    throw Error("Deployment or boundary mismatch");
  const retained = await db.event.findMany({
    where: { block: { lt: from } },
    orderBy: [{ block: "asc" }, { logIndex: "asc" }],
  });
  const blocks = new Map(retained.map((e) => [e.block, e.blockHash]));
  for (const [blockNumber, hash] of blocks)
    if ((await client.getBlock({ blockNumber })).hash !== hash)
      throw Error("Retained journal not canonical; choose earlier boundary");
  const checkpoint =
    from > start ? await client.getBlock({ blockNumber: from - 1n }) : null;
  await db.$transaction(
    async (tx) => {
      // Stop the indexer and back up first. Replace projections atomically from the canonical retained journal.
      await tx.payment.deleteMany();
      await tx.invoice.deleteMany();
      await tx.earning.deleteMany();
      await tx.redemption.deleteMany();
      await tx.partner.deleteMany();
      await tx.campaign.deleteMany();
      await tx.merchant.deleteMany();
      await tx.event.deleteMany({ where: { block: { gte: from } } });
      await tx.checkpoint.deleteMany();
      for (const e of retained)
        await project(tx, {
          ...e,
          args: e.args as Record<string, string | boolean>,
        });
      if (checkpoint)
        await tx.checkpoint.create({
          data: { id: identity, block: from - 1n, hash: checkpoint.hash! },
        });
    },
    { timeout: 120000 },
  );
  console.info(
    "Canonical retained events replayed. Restart the indexer to fetch the remaining chain history.",
  );
} catch {
  console.error(
    "Replay refused or failed. Stop indexer, back up database, verify network and replay boundary; connection details suppressed.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
