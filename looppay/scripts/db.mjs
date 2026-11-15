import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
try {
  try {
    loadEnvFile(".env.local");
  } catch {
    loadEnvFile(".env");
  }
} catch {
  /* CI may supply environment directly. */
}
const result = spawnSync(
  "pnpm",
  ["--filter", "@looppay/indexer", "exec", "prisma", ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
