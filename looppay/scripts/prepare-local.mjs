import { readFileSync, writeFileSync, existsSync, symlinkSync } from "node:fs";
const rpc = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";
async function request(method) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}
if ((await request("eth_chainId")) !== "0x7a69")
  throw new Error("Local Anvil chain 31337 only");
const [account] = await request("eth_accounts");
if (!account) throw new Error("No unlocked local account");
if (!existsSync(".env"))
  writeFileSync(
    ".env",
    readFileSync(".env.example", "utf8").replace(
      /^DEPLOYER_ADDRESS=.*$/m,
      `DEPLOYER_ADDRESS=${account}`,
    ),
  );
else {
  let env = readFileSync(".env", "utf8");
  if (!/^NEXT_PUBLIC_CHAIN_ID=31337$/m.test(env))
    throw new Error("Refusing to modify non-local configuration");
  env = env.replace(/^DEPLOYER_ADDRESS=$/m, `DEPLOYER_ADDRESS=${account}`);
  writeFileSync(".env", env);
}
if (!existsSync("apps/web/.env.local"))
  symlinkSync("../../.env", "apps/web/.env.local");
console.info(
  "Prepared local configuration with a public unlocked Anvil account. No keys used.",
);
