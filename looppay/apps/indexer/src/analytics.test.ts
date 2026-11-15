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
it("separates test and self activity and deducts refunds without releasing liabilities", () => {
  const result = summarize(
    [
      { customer: "a", amount: "100", eligible: true, rewardEarning: true },
      { customer: "A", amount: "50", eligible: true },
      {
        customer: "test",
        amount: "999999",
        isTest: true,
        eligible: false,
        exclusionReason: "4",
      },
      {
        customer: "owner",
        amount: "888",
        eligible: false,
        exclusionReason: "1",
      },
      {
        customer: "identity",
        amount: "10",
        eligible: false,
        exclusionReason: "2",
      },
    ],
    [
      {
        funded: "100",
        earned: "30",
        redeemed: "10",
        withdrawn: "70",
        closed: true,
        active: false,
        start: "0",
        end: "999",
      },
    ],
    1,
    1n,
  );
  expect(result.volume).toBe("160");
  expect(result.grossVolume).toBe("1001047");
  expect(result.eligiblePaymentCount).toBe(2);
  expect(result.rewardEarningPaymentCount).toBe(1);
  expect(result.excludedPaymentCount).toBe(3);
  expect(result.uniquePublicWalletAddresses).toBe(2);
  expect(result.repeatPublicWalletAddresses).toBe(1);
  expect(result.fundsRemaining).toBe("20");
  expect(result.availableToEarn).toBe("0");
  expect(result.activeCampaigns).toBe(0);
});
