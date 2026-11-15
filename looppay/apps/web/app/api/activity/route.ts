import { configuredNetwork } from "../../../lib/network";
import { database, unavailable } from "../../../lib/db";
import { parseMetadata } from "../../../lib/forms";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const merchant = url.searchParams.get("merchant");
  const customer = url.searchParams.get("customer")?.toLowerCase();
  if (
    (merchant && !/^[1-9]\d*$/.test(merchant)) ||
    (customer && !/^0x[0-9a-f]{40}$/.test(customer)) ||
    (!merchant && !customer)
  )
    return Response.json(
      { error: "Provide a valid merchant or customer" },
      { status: 400 },
    );
  try {
    const db = database();
    const token = configuredNetwork()?.token;
    if (!token) return unavailable();
    const tokenFilter = { equals: token, mode: "insensitive" as const };
    if (merchant) {
      const [invoices, campaigns] = await Promise.all([
        db.invoice.findMany({
          where: { merchantId: merchant, token: tokenFilter },
          orderBy: { id: "desc" },
          take: 100,
        }),
        db.campaign.findMany({
          where: { merchantId: merchant, token: tokenFilter },
          take: 100,
        }),
      ]);
      return Response.json({ invoices, campaigns });
    }
    const matchingCampaigns = await db.campaign.findMany({
      where: { token: tokenFilter },
      select: { id: true },
    });
    const campaignFilter = { in: matchingCampaigns.map((c) => c.id) };
    const [payments, earnings, redemptions, optins] = await Promise.all([
      db.payment.findMany({
        where: { customer, token: tokenFilter },
        take: 100,
        orderBy: { block: "desc" },
        select: { id: true, amount: true, transactionHash: true },
      }),
      db.earning.findMany({
        where: { customer, campaignId: campaignFilter },
        distinct: ["campaignId"],
        take: 1000,
      }),
      db.redemption.findMany({
        where: { customer, campaignId: campaignFilter },
        take: 100,
      }),
      db.partner.findMany({ where: { optedIn: true }, take: 100 }),
    ]);
    const sourceCampaigns = await db.campaign.findMany({
      where: { id: { in: earnings.map((e) => e.campaignId) } },
    });
    const sourceMerchants = await db.merchant.findMany({
      where: { id: { in: sourceCampaigns.map((c) => c.merchantId) } },
    });
    const merchants = await db.merchant.findMany({
      where: { id: { in: optins.map((p) => p.id) } },
    });
    return Response.json({
      payments,
      earnings: earnings.map((e) => {
        const c = sourceCampaigns.find((c) => c.id === e.campaignId);
        const m = sourceMerchants.find((m) => m.id === c?.merchantId);
        return { ...e, name: m ? parseMetadata(m.metadata).name : undefined };
      }),
      redemptions,
      partners: merchants.map((m) => ({
        id: m.id,
        name: parseMetadata(m.metadata).name ?? "Shop name not published",
        location: parseMetadata(m.metadata).location,
        category: parseMetadata(m.metadata).category,
      })),
    });
  } catch {
    return unavailable();
  }
}
