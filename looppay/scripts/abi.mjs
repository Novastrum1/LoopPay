import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
mkdirSync("packages/sdk/src", { recursive: true });
let source =
  "// Generated from Foundry artifacts; run pnpm abi after compiling.\n";
for (const [name, key] of [
  ["LoopPayRegistry", "registry"],
  ["LoopPayCheckout", "checkout"],
  ["LoopPayRewards", "rewards"],
]) {
  const { abi } = JSON.parse(
    readFileSync(`packages/contracts/out/${name}.sol/${name}.json`, "utf8"),
  );
  source += `export const ${key}Abi = ${JSON.stringify(abi)} as const;\n`;
}
writeFileSync("packages/sdk/src/abi.ts", source);
