import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "packages/**/tests/**/*.test.ts",
      "apps/indexer/src/**/*.test.ts",
      "apps/web/lib/**/*.test.ts",
    ],
  },
});
