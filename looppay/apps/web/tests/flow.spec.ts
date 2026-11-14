import { test, expect } from "@playwright/test";
test("merchant discovery, safe unconfigured checkout, and rewards empty state", async ({
  page,
}) => {
  test.skip(
    process.env.LOOPPAY_E2E_CHAIN === "true",
    "Unconfigured smoke test runs separately",
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Every checkout/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Open your merchant space/ }).click();
  await expect(page).toHaveURL(/\/merchant$/, { timeout: 30000 });
  await expect(page.getByLabel("Business name")).toBeVisible();
  await page.getByLabel("Business name").fill("Neighborhood Flowers");
  await page.getByLabel("Category", { exact: true }).fill("Florist");
  await expect(
    page.getByRole("button", { name: "Save merchant profile" }),
  ).toBeDisabled();
  await page.goto("/pay/1");
  await expect(
    page.getByText("Contracts are not configured.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay invoice" })).toHaveCount(
    0,
  );
  await page.goto("/wallet");
  await expect(
    page.getByText("Your first reward is one checkout away.", { exact: false }),
  ).toBeVisible();
  await page.goto("/docs");
  await expect(
    page.getByRole("heading", { name: "How rewards are backed" }),
  ).toBeVisible();
});
