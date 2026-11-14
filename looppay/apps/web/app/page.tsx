import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ScanLine,
  Store,
  HeartHandshake,
  Check,
  Flower2,
} from "lucide-react";
import { Button } from "../components/ui/button";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <span className="status-dot" />A little more local. A lot more
            connected.
          </span>
          <h1>
            Every checkout.
            <br />A reason to
            <br />
            <em>come back.</em>
          </h1>
          <p className="lead">
            Get paid in stablecoins. Turn everyday purchases into rewards that
            travel from one great local business to the next.
          </p>
          <div className="actions">
            <Button asChild>
              <Link href="/merchant">
                Open your merchant space <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Link className="text-link" href="/wallet">
              Explore your rewards <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-notes">
            <span>
              <Check size={15} />
              Direct to your wallet
            </span>
            <span>
              <Check size={15} />
              No protocol fee
            </span>
            <span>
              <Check size={15} />
              Powered by QIE
            </span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Illustration of a LoopPay merchant receipt"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-note">
            your neighborhood,
            <br />
            with benefits.
          </span>
          <div className="receipt-illustration">
            <div className="receipt-top">
              <span className="store-icon">
                <Store />
              </span>
              <span>
                THE CORNER STORE<small>Illustrative checkout · synthetic</small>
              </span>
            </div>
            <div className="dashed" />
            <span className="muted">A little everyday good</span>
            <strong className="sample-amount">
              24.00 <small>stablecoins</small>
            </strong>
            <div className="illustrated-qr">
              <ScanLine size={90} strokeWidth={1} />
              <span>PAY. EARN. REPEAT.</span>
            </div>
            <div className="sample-reward">
              <Flower2 />
              <div>
                Something good comes next.
                <small>Earn rewards across the Loop.</small>
              </div>
            </div>
          </div>
          <div className="floating-note">
            <span>↗</span>One purchase.
            <br />
            <strong>More possibilities.</strong>
          </div>
        </div>
      </section>
      <section className="ribbon">
        <span>Small shops. Bigger possibilities.</span>
        <span>01 / PAY SIMPLY</span>
        <span>02 / EARN LOCALLY</span>
        <span>03 / KEEP IT GOING</span>
      </section>
      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">THE LOOP EFFECT</span>
          <h2>
            A better kind of
            <br />
            repeat business.
          </h2>
          <p>
            A payment is the beginning of a relationship. Make the next visit
            feel just as good as the first.
          </p>
        </div>
        <div className="feature-grid">
          {[
            [
              ScanLine,
              "A scan away from settled.",
              "Create an invoice, share a QR, and receive the stablecoin payment directly in your payout wallet.",
            ],
            [
              Store,
              "Your rewards. Your rules.",
              "Set a campaign, fund its reserve, and give customers a reason to choose you again.",
            ],
            [
              HeartHandshake,
              "Good neighbors, connected.",
              "Customers spend earned rewards at opted-in Loop Network partners. The issuing campaign pays the partner.",
            ],
          ].map(([Icon, title, copy]) => {
            const I = Icon as typeof ScanLine;
            return (
              <article className="feature" key={String(title)}>
                <I size={29} />
                <h3>{String(title)}</h3>
                <p>{String(copy)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="cta">
        <Flower2 size={50} />
        <div>
          <span className="eyebrow">LET’S KEEP GOOD BUSINESS GOING</span>
          <h2>Your next regular starts here.</h2>
        </div>
        <Button asChild>
          <Link href="/merchant">
            Start your Loop <ArrowUpRight size={18} />
          </Link>
        </Button>
      </section>
    </>
  );
}
