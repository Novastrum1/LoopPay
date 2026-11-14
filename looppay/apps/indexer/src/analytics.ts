import type { PrismaClient } from "@prisma/client";
export function summarize(
  payments: { amount: string; customer: string }[],
  campaigns: {
    funded: string;
    earned: string;
    redeemed: string;
    active: boolean;
    start: string;
    end: string;
  }[],
  redemptions: number,
  now = BigInt(Math.floor(Date.now() / 1000)),
) {
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
  return {
    volume: payments.reduce((n, p) => n + BigInt(p.amount), 0n).toString(),
    paymentCount: payments.length,
    uniqueCustomers: counts.size,
    repeatCustomers: [...counts.values()].filter((n) => n > 1).length,
    activeCampaigns: campaigns.filter(
      (c) => c.active && BigInt(c.start) <= now && BigInt(c.end) > now,
    ).length,
    fundsRemaining: (sum("funded") - redeemed).toString(),
    availableToEarn: (sum("funded") - earned).toString(),
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
