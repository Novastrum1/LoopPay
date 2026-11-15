import { test, expect } from "@playwright/test";
for (const width of [360, 768, 1440]) {
  test(`demo journey at ${width}px`, async ({ page }) => {
    test.skip(
      process.env.LOOPPAY_E2E_CHAIN === "true",
      "Demo configuration only",
    );
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Every checkout",
    );
    await expect(
      page.getByText("You are viewing demo data.", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 901) {
      await page.getByRole("button", { name: "Menu" }).click();
      await expect(
        page.getByRole("link", { name: "My rewards", exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: `/tmp/looppay-home-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("link", { name: "Try the demo checkout" }).click();
    await page.getByRole("button", { name: "Try demo payment" }).click();
    await page.getByRole("button", { name: "Confirm demo payment" }).click();
    await expect(
      page.getByRole("heading", { name: "Demo payment complete." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Explore demo rewards" }).click();
    await page.getByRole("button", { name: /Demo Market Basket/ }).click();
    await page.getByLabel("Amount (demo credits)").fill("20");
    await page
      .getByRole("button", { name: "Spend rewards", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "You have 12.5",
    );
    await page.getByLabel("Amount (demo credits)").fill("2.5");
    await page
      .getByRole("button", { name: "Spend rewards", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirm demo spend" }).click();
    await expect(
      page.getByText("Demo complete:", { exact: false }),
    ).toBeVisible();
    await page.goto("/merchant/invoices/new");
    await page.getByLabel("Amount (demo credits)").fill("15");
    await page.getByLabel("Short description").fill("Demo lunch");
    await page.getByRole("button", { name: "Create demo invoice" }).click();
    await expect(
      page.getByAltText("QR code opening the demo invoice"),
    ).toBeVisible();
    await page.getByRole("link", { name: /http.*\/pay\/demo-/ }).click();
    await page.getByRole("button", { name: "Try demo payment" }).click();
    await page.getByRole("button", { name: "Confirm demo payment" }).click();
    await page.goto("/merchant");
    await expect(
      page.getByText("15 demo credits · Paid (simulation)"),
    ).toBeVisible();
    await page.goto("/merchant/campaigns/new");
    await page.getByLabel("Reserve funding (demo credits)").fill("100");
    await page.getByLabel("Start date").fill("2027-01-01T12:00");
    await page.getByLabel("End date").fill("2027-02-01T12:00");
    await page.getByRole("button", { name: "Review campaign" }).click();
    await expect(
      page.getByText("You will give 5% back", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm demo campaign" }).click();
    await expect(
      page.getByText("Demo campaign created.", { exact: false }),
    ).toBeVisible();
    for (const path of ["/merchant/campaigns/new", "/wallet", "/docs"]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page).toHaveTitle(/LoopPay/);
    }
    await page.screenshot({
      path: `/tmp/looppay-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("reduced motion keeps the globe static", async ({ page }) => {
  test.skip(
    process.env.LOOPPAY_E2E_CHAIN === "true",
    "Demo configuration only",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const globe = page.getByRole("img", { name: /Illustrative globe/ });
  await globe.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const first = await globe.evaluate((el) =>
    (el as HTMLCanvasElement).toDataURL(),
  );
  await page.waitForTimeout(250);
  expect(
    await globe.evaluate((el) => (el as HTMLCanvasElement).toDataURL()),
  ).toEqual(first);
});

test("globe pause and rotation controls work", async ({ page }) => {
  test.skip(
    process.env.LOOPPAY_E2E_CHAIN === "true",
    "Demo configuration only",
  );
  await page.goto("/");
  const globe = page.getByRole("img", { name: /Illustrative globe/ });
  await globe.scrollIntoViewIfNeeded();
  await expect(
    page.getByText("13 countries · one illustrative loop"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause globe animation" }).click();
  await expect(
    page.getByRole("button", { name: "Resume globe animation" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(150);
  const paused = await globe.evaluate((el) =>
    (el as HTMLCanvasElement).toDataURL(),
  );
  await page.waitForTimeout(250);
  expect(
    await globe.evaluate((el) => (el as HTMLCanvasElement).toDataURL()),
  ).toEqual(paused);
  await page.getByRole("button", { name: "Rotate globe left" }).click();
  const rotated = await globe.evaluate((el) =>
    (el as HTMLCanvasElement).toDataURL(),
  );
  expect(rotated).not.toEqual(paused);
  await globe.focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await globe.evaluate((el) => (el as HTMLCanvasElement).toDataURL()),
  ).not.toEqual(rotated);
});
