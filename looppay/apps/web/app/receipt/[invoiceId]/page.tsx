export const metadata = {
  title: "Payment receipt",
  description:
    "Stablecoin checkout and shared rewards for local businesses on QIE. Review payments, campaigns, and partner rewards with LoopPay.",
};
import { Checkout } from "../../../components/checkout";
export default async function Page({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  return <Checkout invoiceId={invoiceId} receipt={true} />;
}
