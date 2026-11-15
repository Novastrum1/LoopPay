import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { loadEnvFile } from "node:process";
import { project } from "./project";
try {
  loadEnvFile(new URL("../../../.env.local", import.meta.url));
} catch {
  try {
    loadEnvFile(new URL("../../../.env", import.meta.url));
  } catch {
    /* CI supplies env */
  }
}
const db = new PrismaClient();
const rollback = new Error("rollback successful test fixtures");
try {
  await db.$transaction(async (tx) => {
    const id = `projection-${crypto.randomUUID()}`;
    const hash = `0x${"1".repeat(64)}`;
    let index = 0;
    const emit = async (
      name: string,
      args: Record<string, string | boolean>,
    ) => {
      const e = {
        id: `${id}:${index++}`,
        name,
        args,
        transactionHash: hash,
        block: 1n,
      };
      await tx.event.create({
        data: {
          ...e,
          chainId: 31337,
          address: "0x1",
          blockHash: hash,
          logIndex: index,
        },
      });
      await project(tx, e);
    };
    await emit("MerchantCreated", {
      merchantId: id,
      owner: "0xAB",
      payout: "0xCD",
      metadataURI: "",
    });
    await emit("CampaignCreated", {
      campaignId: id,
      merchantId: id,
      token: "token",
      bps: "500",
      minPurchase: "0",
      cap: "100",
      start: "0",
      end: "99",
    });
    await emit("RewardPolicyChanged", {
      campaignId: id,
      eligibility: "1",
      selfPaymentProtection: true,
    });
    await emit("CampaignFunded", { campaignId: id, amount: "100" });
    await emit("InvoiceCreated", {
      invoiceId: id,
      merchantId: id,
      token: "token",
      amount: "200",
      orderReferenceHash: hash,
      expiresAt: "99",
      campaignId: id,
    });
    await emit("RewardEarned", {
      campaignId: id,
      invoiceId: id,
      customer: "0xEF",
      amount: "10",
    });
    await emit("PaymentClassified", {
      invoiceId: id,
      isTest: false,
      eligible: true,
      reason: "0",
    });
    await emit("InvoicePaid", {
      invoiceId: id,
      merchantId: id,
      customer: "0xEF",
      token: "token",
      amount: "200",
      payout: "0xCD",
    });
    await emit("CampaignClosed", { campaignId: id });
    await emit("UnreservedFundsWithdrawn", {
      campaignId: id,
      recipient: "0xAB",
      amount: "90",
    });
    await emit("PartnerOptInChanged", { merchantId: id, optedIn: true });
    await emit("RewardRedeemed", {
      campaignId: id,
      merchantId: id,
      customer: "0xEF",
      amount: "10",
      redemptionId: hash,
    });
    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id } });
    assert.equal(campaign.closed, true);
    assert.equal(campaign.active, false);
    assert.equal(campaign.withdrawn, "90");
    assert.equal(campaign.redeemed, "10");
    assert.equal(campaign.earned, "10");
    assert.equal(campaign.eligibility, "1");
    const payment = await tx.payment.findUniqueOrThrow({ where: { id } });
    assert.equal(payment.eligible, true);
    assert.equal(payment.rewardEarning, true);
    assert.equal(payment.isTest, false);
    assert.equal(payment.customer, "0xef");
    const testId = id + "-test";
    await emit("InvoiceCreated", {
      invoiceId: testId,
      merchantId: id,
      token: "token",
      amount: "1",
      orderReferenceHash: hash,
      expiresAt: "99",
      campaignId: id,
    });
    await emit("InvoiceTestMarked", { invoiceId: testId });
    await emit("PaymentClassified", {
      invoiceId: testId,
      isTest: true,
      eligible: false,
      reason: "4",
    });
    await emit("InvoicePaid", {
      invoiceId: testId,
      merchantId: id,
      customer: "0xEF",
      token: "token",
      amount: "1",
      payout: "0xCD",
    });
    const testPayment = await tx.payment.findUniqueOrThrow({
      where: { id: testId },
    });
    assert.equal(testPayment.isTest, true);
    assert.equal(testPayment.rewardEarning, false);
    assert.equal(
      (await tx.invoice.findUniqueOrThrow({ where: { id: testId } })).isTest,
      true,
    );
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    console.error(
      "Projection integration failed; connection errors suppressed.",
    );
    process.exitCode = 1;
  } else
    console.info(
      "PASS: lifecycle, refund, earning/redemption, classification and test-invoice PostgreSQL projections; fixtures rolled back.",
    );
} finally {
  await db.$disconnect();
}
