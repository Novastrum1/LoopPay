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
  /* environment may be supplied by CI */
}
// Do not invent an Etherscan endpoint or assume explorer API compatibility.
const required = [
  "QIE_TESTNET_RPC_URL",
  "QIE_TESTNET_VERIFIER_URL",
  "VERIFY_CONTRACT_ADDRESS",
  "VERIFY_CONTRACT_NAME",
  "VERIFY_CONSTRUCTOR_ARGS",
];
for (const name of required)
  if (!process.env[name])
    throw new Error(
      `Set ${name} after confirming the official QIE verification workflow`,
    );
let endpoint;
try {
  endpoint = new URL(process.env.QIE_TESTNET_RPC_URL);
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
const chain = spawnSync(
  foundryBinary("cast"),
  ["chain-id", "--rpc-url", process.env.QIE_TESTNET_RPC_URL],
  { encoding: "utf8" },
);
if (chain.stdout.trim() !== "1983") throw new Error("Not QIE testnet");
if (process.env.QIE_VERIFICATION_WORKFLOW_CONFIRMED !== "true")
  throw new Error("Official verification workflow confirmation is required");
const result = spawnSync(
  foundryBinary("forge"),
  [
    "verify-contract",
    process.env.VERIFY_CONTRACT_ADDRESS,
    process.env.VERIFY_CONTRACT_NAME,
    "--chain-id",
    "1983",
    "--compiler-version",
    "v0.8.24+commit.e11b9ed9",
    "--verifier",
    "blockscout",
    "--verifier-url",
    process.env.QIE_TESTNET_VERIFIER_URL,
    "--constructor-args",
    process.env.VERIFY_CONSTRUCTOR_ARGS,
    "--watch",
  ],
  { cwd: "packages/contracts", stdio: "inherit" },
);
process.exit(result.status ?? 1);
