import { Checkout } from "../../../components/checkout";
export default async function Page({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  return <Checkout invoiceId={invoiceId} receipt={true} />;
}
