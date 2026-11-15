import { foundryBinary } from "./foundry.mjs";
import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
try {
  try {
    loadEnvFile(".env.local");
  } catch {
    loadEnvFile(".env");
  }
} catch {
  /* CI can supply environment directly. */
}
const mode = process.argv[2];
if (!["local", "testnet"].includes(mode))
  throw new Error("Only local and testnet deployment are supported");
const rpc =
  mode === "local"
    ? process.env.LOCAL_RPC_URL
    : process.env.QIE_TESTNET_RPC_URL;
const sender = process.env.DEPLOYER_ADDRESS;
if (!rpc || !/^0x[0-9a-fA-F]{40}$/.test(sender ?? ""))
  throw new Error("Set RPC URL and public DEPLOYER_ADDRESS");
let endpoint;
try {
  endpoint = new URL(rpc);
} catch {
  throw new Error("Set a valid public RPC URL");
}
if (
  endpoint.username ||
  endpoint.password ||
  endpoint.search ||
  !["http:", "https:"].includes(endpoint.protocol)
)
  throw new Error("Use a public RPC URL without embedded credentials");
const cast = spawnSync(foundryBinary("cast"), ["chain-id", "--rpc-url", rpc], {
  encoding: "utf8",
});
if (cast.status !== 0) throw new Error("Unable to confirm RPC chain ID");
const expected = mode === "local" ? "31337" : "1983";
if (cast.stdout.trim() !== expected)
  throw new Error("Refusing deployment to unexpected chain");
if (mode === "testnet" && !process.env.DEPLOYER_ACCOUNT)
  throw new Error("Set an encrypted Foundry keystore account reference");
const tests = spawnSync("pnpm", ["test:contracts"], { stdio: "inherit" });
if (tests.status !== 0) process.exit(1);
const args = [
  "script",
  "script/Deploy.s.sol:Deploy",
  "--rpc-url",
  rpc,
  "--sender",
  sender,
  "--broadcast",
  ...(mode === "local"
    ? ["--unlocked"]
    : ["--account", process.env.DEPLOYER_ACCOUNT]),
];
const result = spawnSync(foundryBinary("forge"), args, {
  cwd: "packages/contracts",
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
