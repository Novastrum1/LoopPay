import { database, unavailable } from "../../../../lib/db";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  if (!/^[1-9]\d*$/.test(invoiceId))
    return Response.json({ error: "Invalid invoice" }, { status: 400 });
  try {
    const payment = await database().payment.findUnique({
      where: { id: invoiceId },
      select: { transactionHash: true, customer: true },
    });
    return payment
      ? Response.json(payment)
      : Response.json({ error: "Not indexed yet" }, { status: 404 });
  } catch {
    return unavailable();
  }
}
