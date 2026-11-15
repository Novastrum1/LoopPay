import { PrismaClient, Prisma } from "@prisma/client";
import { createPublicClient, http, decodeEventLog, type Address } from "viem";
import { z } from "zod";
import { loadNetwork, chainFor } from "@looppay/config";
import { registryAbi, checkoutAbi, rewardsAbi } from "@looppay/sdk";
import { project } from "./project";
const n = loadNetwork(process.env);
const start = z
  .string()
  .min(1, "Set DEPLOYMENT_BLOCK")
  .transform(BigInt)
  .pipe(z.bigint().nonnegative())
  .parse(process.env.DEPLOYMENT_BLOCK);
const confirmations = z.coerce
  .bigint()
  .min(2n)
  .default(12n)
  .parse(process.env.INDEXER_CONFIRMATIONS);
const db = new PrismaClient();
const client = createPublicClient({
  chain: chainFor(n),
  transport: http(process.env.QIE_RPC_URL || n.rpcUrl, { retryCount: 3 }),
});
const addresses = [n.registry, n.checkout, n.rewards] as Address[];
const identity = `${n.chainId}:${addresses.join(":")}`;
const abi = [...registryAbi, ...checkoutAbi, ...rewardsAbi];
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
class ReorgError extends Error {}
async function poll() {
  if ((await client.getChainId()) !== n.chainId)
    throw new Error("RPC chain mismatch");
  const checkpoint = await db.checkpoint.findUnique({
    where: { id: identity },
  });
  if (checkpoint) {
    const block = await client.getBlock({ blockNumber: checkpoint.block });
    if (block.hash !== checkpoint.hash)
      throw new ReorgError(
        "Checkpoint reorg: stop indexer, back up database, and follow docs/indexer-recovery.md to replay canonical events",
      );
  }
  const head = await client.getBlockNumber();
  if (head < confirmations) return;
  const end = head - confirmations;
  let from = checkpoint ? checkpoint.block + 1n : start;
  while (from <= end && !stopping) {
    const to = from + 499n > end ? end : from + 499n;
    const logs = await client.getLogs({
      address: addresses,
      fromBlock: from,
      toBlock: to,
    });
    logs.sort((a, b) =>
      a.blockNumber! < b.blockNumber!
        ? -1
        : a.blockNumber! > b.blockNumber!
          ? 1
          : (a.logIndex ?? 0) - (b.logIndex ?? 0),
    );
    const block = await client.getBlock({ blockNumber: to });
    await db.$transaction(
      async (tx) => {
        for (const log of logs) {
          if (
            !log.transactionHash ||
            !log.blockHash ||
            log.logIndex === null ||
            log.blockNumber === null
          )
            throw new Error("Incomplete log");
          let decoded;
          try {
            decoded = decodeEventLog({
              abi,
              data: log.data,
              topics: log.topics,
              strict: true,
            });
          } catch {
            continue;
          }
          const id = `${n.chainId}:${log.transactionHash}:${log.logIndex}`;
          if (await tx.event.findUnique({ where: { id } })) continue;
          const args = JSON.parse(
            JSON.stringify(decoded.args, (_, v) =>
              typeof v === "bigint" ? v.toString() : v,
            ),
          ) as Record<string, string | boolean>;
          await tx.event.create({
            data: {
              id,
              chainId: n.chainId,
              address: log.address,
              name: decoded.eventName,
              block: log.blockNumber,
              blockHash: log.blockHash,
              transactionHash: log.transactionHash,
              logIndex: log.logIndex,
              args: args as Prisma.InputJsonValue,
            },
          });
          await project(tx, {
            id,
            name: decoded.eventName,
            args,
            transactionHash: log.transactionHash,
            block: log.blockNumber,
          });
        }
        await tx.checkpoint.upsert({
          where: { id: identity },
          create: { id: identity, block: to, hash: block.hash! },
          update: { block: to, hash: block.hash! },
        });
      },
      { timeout: 60000 },
    );
    console.info(`Indexed through ${to}`);
    from = to + 1n;
  }
}
try {
  const existing = await db.checkpoint.findFirst();
  if (existing && existing.id !== identity)
    throw new Error("Use a fresh database for this deployment/network");
  while (!stopping) {
    try {
      await poll();
    } catch (error) {
      if (error instanceof ReorgError) throw error;
      console.error(
        "Indexer RPC/database request failed; retrying in five seconds. Check connectivity and service health. Raw errors are suppressed to avoid logging connection credentials.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
} finally {
  await db.$disconnect();
}
