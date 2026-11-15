export const metadata = {
  title: "Stablecoin checkout & shared rewards",
  description:
    "Stablecoin checkout and shared rewards for local businesses on QIE. Review payments, campaigns, and partner rewards with LoopPay.",
};
import Link from "next/link";
import { ArrowUpRight, ScanLine, Wallet, Coins, Check } from "lucide-react";
import { Globe } from "../components/globe";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">LOCAL BUSINESS. SHARED REWARDS.</span>
          <h1>Every checkout gives people a reason to come back.</h1>
          <p className="lead">
            Get paid in stablecoins straight to your wallet. Customers earn
            rewards they can spend at other shops in the Loop.
          </p>
          <div className="actions">
            <Link prefetch={false} className="button" href="/merchant">
              Open your merchant space <ArrowUpRight size={20} />
            </Link>
            <Link prefetch={false} className="button outline" href="/pay/demo">
              Try the demo checkout
            </Link>
          </div>
          <div className="trust-row">
            {[
              "Paid direct to your wallet",
              "No protocol fees in v1",
              "Built on QIE",
            ].map((t) => (
              <span key={t}>
                <Check size={18} />
                {t}
              </span>
            ))}
          </div>
        </div>
        <Globe />
      </section>
      <section className="section">
        <div className="section-intro">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>
            Three small steps.
            <br />
            More reasons to shop local.
          </h2>
          <p>A familiar checkout, with rewards that go beyond one shop.</p>
        </div>
        <div className="feature-grid">
          {[
            [
              ScanLine,
              "01 / Scan",
              "Open the shop’s payment link or scan its QR code. Review your invoice before paying.",
            ],
            [
              Wallet,
              "02 / Pay",
              "Connect your wallet and pay in the supported stablecoin. The payment goes straight to the shop’s payout wallet.",
            ],
            [
              Coins,
              "03 / Earn",
              "Earn rewards from funded campaigns. Spend them at opted-in partner shops; the issuing reserve pays that shop.",
            ],
          ].map(([Icon, title, copy]) => {
            const I = Icon as typeof ScanLine;
            return (
              <article className="feature" key={String(title)}>
                <div className="icon-box">
                  <I size={26} />
                </div>
                <h3>{String(title)}</h3>
                <p>{String(copy)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="stable-section">
        <div>
          <span className="eyebrow">A LITTLE CLARITY</span>
          <h2>What is a stablecoin?</h2>
        </div>
        <div>
          <p>
            A stablecoin is a digital token designed to track a currency such as
            the US dollar. You hold it in a wallet and use it to pay a shop.
          </p>
          <p>
            Its value depends on its issuer and backing, so it can lose value.
            You also need a little QIE to pay network gas fees.
          </p>
          <Link prefetch={false} className="text-link" href="/docs">
            Understand payments and rewards →
          </Link>
        </div>
      </section>
      <section className="faq">
        <span className="eyebrow">GOOD QUESTIONS</span>
        <h2>Before your first checkout.</h2>
        {[
          [
            "Where does my payment go?",
            "Directly to the merchant’s current payout wallet. LoopPay is a checkout and rewards network on QIE.",
          ],
          [
            "Are there fees?",
            "No protocol fees in v1. Network gas fees still apply to payments, approvals, and other transactions.",
          ],
          [
            "Where can I spend rewards?",
            "At shops that have opted into the Loop Network. The campaign that issued your reward pays the partner shop from its funded reserve.",
          ],
          [
            "Can I reverse a payment?",
            "Payments and reward redemptions are final and cannot be reversed through LoopPay. Check the shop, amount, token, and network before confirming.",
          ],
          [
            "Is this activity real?",
            "The globe, cities, and reward ticker are illustrative demo data. In Demo mode, all balances and transactions are local examples with no monetary value.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
