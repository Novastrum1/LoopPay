import { it, expect } from "vitest";
import { summarize } from "./analytics";
it("counts returning customers and computes redemption by value without floats", () => {
  const result = summarize(
    [
      { customer: "0xAB", amount: "900719925474099300" },
      { customer: "0xab", amount: "5" },
    ],
    [
      {
        funded: "100",
        earned: "30",
        redeemed: "10",
        active: true,
        start: "0",
        end: "9999999999",
      },
    ],
    2,
    1n,
  );
  expect(result.volume).toBe("900719925474099305");
  expect(result.repeatCustomers).toBe(1);
  expect(result.uniqueCustomers).toBe(1);
  expect(result.redemptionRate).toBe("33.33");
  expect(result.availableToEarn).toBe("70");
});
