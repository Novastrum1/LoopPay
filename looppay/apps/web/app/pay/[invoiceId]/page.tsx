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
