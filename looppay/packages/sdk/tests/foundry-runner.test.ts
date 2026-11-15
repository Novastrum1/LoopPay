import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
it("propagates native Foundry failures instead of marking CI successful", () => {
  const runner = fileURLToPath(
    new URL("../../../scripts/foundry.mjs", import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [runner, "forge", "invalid-looppay-subcommand"],
    { encoding: "utf8" },
  );
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("unrecognized subcommand");
});
