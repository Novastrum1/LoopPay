import { defineConfig } from "@playwright/test";
const integration = process.env.LOOPPAY_E2E_CHAIN === "true";
const port = integration ? 3002 : 3001;
const url = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests",
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { baseURL: url },
  webServer: {
    command: `pnpm dev --port ${port}`,
    env: {
      NEXT_PUBLIC_APP_URL: url,
      ...(!integration
        ? {
            NEXT_PUBLIC_REGISTRY_ADDRESS: "",
            NEXT_PUBLIC_CHECKOUT_ADDRESS: "",
            NEXT_PUBLIC_REWARDS_ADDRESS: "",
            NEXT_PUBLIC_STABLECOIN_ADDRESS: "",
          }
        : {}),
    },
    url,
    reuseExistingServer: false,
    timeout: 120000,
  },
  workers: 1,
});
