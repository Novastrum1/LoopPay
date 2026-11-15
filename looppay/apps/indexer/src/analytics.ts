import type { PrismaClient } from "@prisma/client";
export function summarize(
  payments: {
    amount: string;
    customer: string;
    isTest?: boolean;
    eligible?: boolean;
    exclusionReason?: string;
    rewardEarning?: boolean;
  }[],
  campaigns: {
    funded: string;
    withdrawn?: string;
    closed?: boolean;
    earned: string;
    redeemed: string;
    active: boolean;
    start: string;
    end: string;
  }[],
  redemptions: number,
  now = BigInt(Math.floor(Date.now() / 1000)),
) {
  const grossPayments = payments;
  payments = payments.filter((p) => !p.isTest && p.exclusionReason !== "1");
  const counts = new Map<string, number>();
  for (const p of payments)
    counts.set(
      p.customer.toLowerCase(),
      (counts.get(p.customer.toLowerCase()) ?? 0) + 1,
    );
  const sum = (key: "funded" | "earned" | "redeemed") =>
    campaigns.reduce((n, c) => n + BigInt(c[key]), 0n);
  const earned = sum("earned"),
    redeemed = sum("redeemed");
  const withdrawn = campaigns.reduce(
    (n, c) => n + BigInt(c.withdrawn ?? "0"),
    0n,
  );
  const volumeOf = (rows: typeof payments) =>
    rows.reduce((n, p) => n + BigInt(p.amount), 0n).toString();
  return {
    grossPaymentCount: grossPayments.length,
    grossVolume: volumeOf(grossPayments),
    eligiblePaymentCount: payments.filter((p) => p.eligible).length,
    eligibleVolume: volumeOf(payments.filter((p) => p.eligible)),
    rewardEarningPaymentCount: payments.filter((p) => p.rewardEarning).length,
    excludedPaymentCount: grossPayments.filter(
      (p) => p.isTest || p.eligible === false,
    ).length,
    selfPaymentCount: grossPayments.filter((p) => p.exclusionReason === "1")
      .length,
    testPaymentCount: grossPayments.filter((p) => p.isTest).length,
    withdrawn: withdrawn.toString(),
    uniquePublicWalletAddresses: counts.size,
    repeatPublicWalletAddresses: [...counts.values()].filter((n) => n > 1)
      .length,
    volume: payments.reduce((n, p) => n + BigInt(p.amount), 0n).toString(),
    paymentCount: payments.length,
    uniqueCustomers: counts.size,
    repeatCustomers: [...counts.values()].filter((n) => n > 1).length,
    activeCampaigns: campaigns.filter(
      (c) =>
        !c.closed && c.active && BigInt(c.start) <= now && BigInt(c.end) > now,
    ).length,
    fundsRemaining: (sum("funded") - redeemed - withdrawn).toString(),
    availableToEarn: (sum("funded") - earned - withdrawn).toString(),
    rewardsEarned: earned.toString(),
    redemptions,
    redemptionRate:
      earned === 0n
        ? "0.00"
        : `${(redeemed * 10000n) / earned / 100n}.${(((redeemed * 10000n) / earned) % 100n).toString().padStart(2, "0")}`,
  };
}
export async function merchantAnalytics(
  db: PrismaClient,
  merchantId: string,
  token?: string,
) {
  const [payments, campaigns, checkpoint] = await Promise.all([
    db.payment.findMany({
      where: {
        merchantId,
        ...(token
          ? { token: { equals: token, mode: "insensitive" as const } }
          : {}),
      },
    }),
    db.campaign.findMany({
      where: {
        merchantId,
        ...(token
          ? { token: { equals: token, mode: "insensitive" as const } }
          : {}),
      },
    }),
    db.checkpoint.findFirst(),
  ]);
  const redemptions = await db.redemption.count({
    where: { campaignId: { in: campaigns.map((c) => c.id) } },
  });
  return {
    ...summarize(payments, campaigns, redemptions),
    indexedThrough: checkpoint?.block.toString() ?? "not indexed",
    demo: false,
  };
}
