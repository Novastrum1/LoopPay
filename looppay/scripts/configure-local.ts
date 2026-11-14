import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, http, parseAbiItem } from "viem";
const rpc = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";
const client = createPublicClient({ transport: http(rpc) });
if ((await client.getChainId()) !== 31337) throw new Error("Local only");
const broadcast = JSON.parse(
  readFileSync(
    "packages/contracts/broadcast/Deploy.s.sol/31337/run-latest.json",
    "utf8",
  ),
) as {
  transactions: {
    contractName: string;
    contractAddress: string;
    hash: string;
  }[];
  receipts: { blockNumber: string }[];
};
const address = (name: string) => {
  const found = broadcast.transactions.find((t) => t.contractName === name);
  if (!found) throw new Error(`Missing ${name}`);
  return found.contractAddress;
};
const env = readFileSync(".env", "utf8");
if (!/^NEXT_PUBLIC_CHAIN_ID=31337$/m.test(env))
  throw new Error("Refusing to modify non-local .env");
const registry = address("LoopPayRegistry") as `0x${string}`;
const events = await client.getLogs({
  address: registry,
  event: parseAbiItem(
    "event TokenApprovalChanged(address indexed token,bool approved)",
  ),
  fromBlock: 0n,
});
const token = events.at(-1)?.args.token;
if (!token) throw new Error("Token approval missing");
const values: Record<string, string> = {
  NEXT_PUBLIC_REGISTRY_ADDRESS: registry,
  NEXT_PUBLIC_CHECKOUT_ADDRESS: address("LoopPayCheckout"),
  NEXT_PUBLIC_REWARDS_ADDRESS: address("LoopPayRewards"),
  NEXT_PUBLIC_STABLECOIN_ADDRESS: token,
  DEPLOYMENT_BLOCK: BigInt(broadcast.receipts[0].blockNumber).toString(),
};
let output = env;
for (const [key, value] of Object.entries(values))
  output = output.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
writeFileSync(".env", output);
console.info(
  "Updated local public contract configuration and first deployment block. No signing material used.",
);
