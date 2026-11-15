import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
/** Invoke the locked native binary: upstream 1.7.1's JS launcher loses child exit codes. */
export function foundryBinary(tool) {
  if (!["forge", "cast", "anvil"].includes(tool))
    throw new Error("Unsupported Foundry tool");
  const manifest = require.resolve(`@foundry-rs/${tool}/package.json`);
  const pkg = JSON.parse(readFileSync(manifest, "utf8"));
  if (pkg.version !== "1.7.1")
    throw new Error("Review Foundry runner when changing tool version");
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  const platformPackage = `@foundry-rs/${tool}-${process.platform}-${arch}`;
  const name = process.platform === "win32" ? `${tool}.exe` : tool;
  const localRequire = createRequire(manifest);
  let binary;
  try {
    binary = localRequire.resolve(`${platformPackage}/bin/${name}`);
  } catch {
    binary = join(dirname(manifest), "..", "dist", name);
  }
  if (!existsSync(binary))
    throw new Error("Pinned native binary missing; rerun frozen installation");
  return binary;
}
export function runFoundry(tool, args, options = {}) {
  return spawn(foundryBinary(tool), args, { stdio: "inherit", ...options });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const child = runFoundry(process.argv[2], process.argv.slice(3));
  child.on("error", () => {
    console.error("Foundry process failed to start");
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = signal ? 1 : (code ?? 1);
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
}
