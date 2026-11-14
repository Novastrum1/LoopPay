import { merchantAnalytics, summarize } from "@looppay/indexer/analytics";
import { configuredNetwork } from "../../../../lib/network";
import { database, unavailable } from "../../../../lib/db";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ merchantId: string }> },
) {
  const { merchantId } = await params;
  if (!/^[1-9]\d*$/.test(merchantId))
    return Response.json({ error: "Invalid merchant" }, { status: 400 });
  if (
    process.env.DEMO_MODE === "true" &&
    process.env.NEXT_PUBLIC_CHAIN_ID === "31337"
  )
    return Response.json({
      ...summarize(
        [
          { amount: "24000000", customer: "synthetic-customer" },
          { amount: "18000000", customer: "synthetic-customer" },
        ],
        [
          {
            funded: "100000000",
            earned: "2100000",
            redeemed: "1000000",
            start: "0",
            end: "9999999999",
            active: true,
          },
        ],
        1,
      ),
      indexedThrough: "SYNTHETIC",
      demo: true,
    });
  try {
    return Response.json(
      await merchantAnalytics(
        database(),
        merchantId,
        configuredNetwork()?.token,
      ),
    );
  } catch {
    return unavailable();
  }
}
