export const metadata = {
  title: "Checkout",
  description:
    "Stablecoin checkout and shared rewards for local businesses on QIE. Review payments, campaigns, and partner rewards with LoopPay.",
};
import { Checkout } from "../../../components/checkout";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ label?: string }>;
}) {
  const [{ invoiceId }, { label }] = await Promise.all([params, searchParams]);
  return (
    <Checkout
      invoiceId={invoiceId}
      displayLabel={typeof label === "string" ? label : undefined}
    />
  );
}
