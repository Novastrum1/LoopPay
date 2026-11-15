import { createPublicClient, http } from "viem";
import { configuredNetwork } from "../../../lib/network";
import { database } from "../../../lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  const network = configuredNetwork();
  if (!network)
    return Response.json(
      { ready: false, network: "unconfigured", database: "unchecked" },
      { status: 503 },
    );
  try {
    const client = createPublicClient({
      transport: http(network.rpcUrl, { timeout: 5000, retryCount: 0 }),
    });
    const [chainId, head, checkpoint] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
      database().checkpoint.findFirst(),
    ]);
    const identity = `${network.chainId}:${[network.registry, network.checkout, network.rewards].join(":")}`;
    const lag = checkpoint ? head - checkpoint.block : null;
    const canonical = checkpoint
      ? (await client.getBlock({ blockNumber: checkpoint.block })).hash ===
        checkpoint.hash
      : false;
    const configuredLag = process.env.INDEXER_MAX_LAG_BLOCKS ?? "100";
    const maxLag = /^\d+$/.test(configuredLag) ? BigInt(configuredLag) : 100n;
    const ready =
      chainId === network.chainId &&
      checkpoint?.id.toLowerCase() === identity.toLowerCase() &&
      canonical &&
      lag !== null &&
      lag >= 0n &&
      lag <= maxLag;
    return Response.json(
      {
        ready,
        network: network.chainId,
        database: "connected",
        checkpoint: checkpoint?.block.toString() ?? null,
        headBlock: head.toString(),
        lag: lag?.toString() ?? null,
        canonical,
      },
      { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        ready: false,
        network: network.chainId,
        database: "unavailable-or-rpc-failed",
      },
      { status: 503 },
    );
  }
}
