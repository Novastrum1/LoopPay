import { loadEnvFile } from "node:process";
try {
  loadEnvFile(new URL("../../../.env.local", import.meta.url));
} catch {
  try {
    loadEnvFile(new URL("../../../.env", import.meta.url));
  } catch {
    /* supplied runtime environment */
  }
}
await import("./index");
