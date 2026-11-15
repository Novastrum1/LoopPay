import type { Prisma } from "@prisma/client";
export type IndexedEvent = {
  id: string;
  name: string;
  args: Record<string, string | boolean>;
  transactionHash: string;
  block: bigint;
};
export async function project(db: Prisma.TransactionClient, e: IndexedEvent) {
  const a = e.args;
  const s = (k: string) => String(a[k]);
  const tx = e.transactionHash;
  switch (e.name) {
    case "MerchantCreated":
      await db.merchant.create({
        data: {
          id: s("merchantId"),
          owner: s("owner").toLowerCase(),
          payout: s("payout"),
          metadata: s("metadataURI"),
          transactionHash: tx,
        },
      });
      break;
    case "MerchantUpdated":
      await db.merchant.update({
        where: { id: s("merchantId") },
        data: {
          payout: s("payout"),
          metadata: s("metadataURI"),
          transactionHash: tx,
        },
      });
      break;
    case "InvoiceCreated":
      await db.invoice.create({
        data: {
          id: s("invoiceId"),
          merchantId: s("merchantId"),
          token: s("token"),
          amount: s("amount"),
          orderReferenceHash: s("orderReferenceHash"),
          expiresAt: s("expiresAt"),
          campaignId: s("campaignId"),
          status: "Open",
          transactionHash: tx,
        },
      });
      break;
    case "InvoiceTestMarked":
      await db.invoice.update({
        where: { id: s("invoiceId") },
        data: { isTest: true },
      });
      break;
    case "InvoicePaid": {
      await db.invoice.update({
        where: { id: s("invoiceId") },
        data: { status: "Paid" },
      });
      const classification = await db.event.findFirst({
        where: {
          transactionHash: tx,
          name: "PaymentClassified",
          args: { path: ["invoiceId"], equals: s("invoiceId") },
        },
      });
      const classified = classification?.args as
        Record<string, string | boolean> | undefined;
      const earning = await db.earning.findFirst({
        where: { invoiceId: s("invoiceId") },
      });
      await db.payment.create({
        data: {
          id: s("invoiceId"),
          merchantId: s("merchantId"),
          customer: s("customer").toLowerCase(),
          isTest: classified?.isTest === true,
          eligible: classified?.eligible === true,
          exclusionReason: classified
            ? String(classified.reason)
            : "unclassified",
          rewardEarning: !!earning,
          token: s("token"),
          amount: s("amount"),
          payout: s("payout"),
          transactionHash: tx,
          block: e.block,
        },
      });
      break;
    }
    case "InvoiceCancelled":
      await db.invoice.update({
        where: { id: s("invoiceId") },
        data: { status: "Cancelled" },
      });
      break;
    case "CampaignCreated":
      await db.campaign.create({
        data: {
          id: s("campaignId"),
          merchantId: s("merchantId"),
          token: s("token"),
          bps: s("bps"),
          minPurchase: s("minPurchase"),
          cap: s("cap"),
          start: s("start"),
          end: s("end"),
          active: true,
          transactionHash: tx,
        },
      });
      break;
    case "UnreservedFundsWithdrawn":
    case "CampaignFunded":
    case "RewardEarned":
    case "RewardRedeemed": {
      const cid = s("campaignId");
      const row = await db.campaign.findUniqueOrThrow({ where: { id: cid } });
      const field =
        e.name === "UnreservedFundsWithdrawn"
          ? "withdrawn"
          : e.name === "CampaignFunded"
            ? "funded"
            : e.name === "RewardEarned"
              ? "earned"
              : "redeemed";
      await db.campaign.update({
        where: { id: cid },
        data: {
          [field]: (BigInt(row[field]) + BigInt(s("amount"))).toString(),
        },
      });
      if (e.name === "RewardEarned")
        await db.earning.create({
          data: {
            id: e.id,
            campaignId: cid,
            invoiceId: s("invoiceId"),
            customer: s("customer").toLowerCase(),
            amount: s("amount"),
            transactionHash: tx,
          },
        });
      if (e.name === "RewardRedeemed")
        await db.redemption.create({
          data: {
            id: e.id,
            campaignId: cid,
            merchantId: s("merchantId"),
            customer: s("customer").toLowerCase(),
            amount: s("amount"),
            redemptionId: s("redemptionId"),
            transactionHash: tx,
          },
        });
      break;
    }
    case "PartnerOptInChanged":
      await db.partner.upsert({
        where: { id: s("merchantId") },
        create: {
          id: s("merchantId"),
          optedIn: a.optedIn === true,
          transactionHash: tx,
        },
        update: { optedIn: a.optedIn === true, transactionHash: tx },
      });
      break;
    case "CampaignClosed":
      await db.campaign.update({
        where: { id: s("campaignId") },
        data: { closed: true, active: false },
      });
      break;
    case "RewardPolicyChanged":
      await db.campaign.update({
        where: { id: s("campaignId") },
        data: {
          eligibility: s("eligibility"),
          selfPaymentProtection: a.selfPaymentProtection === true,
        },
      });
      break;
    case "CampaignPaused":
      await db.campaign.update({
        where: { id: s("campaignId") },
        data: { active: a.paused !== true },
      });
      break;
  }
}
