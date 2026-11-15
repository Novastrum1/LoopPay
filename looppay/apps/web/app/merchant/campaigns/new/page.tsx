export const metadata = {
  title: "Create a campaign",
  description:
    "Stablecoin checkout and shared rewards for local businesses on QIE. Review payments, campaigns, and partner rewards with LoopPay.",
};
import { MerchantPage } from "../../../../components/merchant";
export default function Page() {
  return <MerchantPage view="campaign-new" />;
}
