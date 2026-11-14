import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { WalletButton } from "./wallet";
export function Header() {
  return (
    <header>
      <Link href="/" className="brand brand-logo" aria-label="LoopPay home">
        <Image
          src="/brand/looppay-logo.webp"
          width={840}
          height={201}
          alt="LoopPay"
          className="brand-image"
          priority
        />
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/merchant">For merchants</Link>
        <Link href="/wallet">My rewards</Link>
        <Link href="/docs">How it works</Link>
      </nav>
      <WalletButton />
    </header>
  );
}
export function MerchantNav() {
  return (
    <nav className="merchant-nav" aria-label="Merchant navigation">
      {[
        ["/merchant", "Overview"],
        ["/merchant/invoices/new", "New invoice"],
        ["/merchant/campaigns", "Campaigns"],
        ["/merchant/partners", "Loop Network"],
        ["/merchant/analytics", "Analytics"],
      ].map(([url, label]) => (
        <Link href={url} key={url}>
          {label}
          <ArrowUpRight size={13} />
        </Link>
      ))}
    </nav>
  );
}
export function Footer() {
  return (
    <footer>
      <Link href="/" className="brand brand-logo" aria-label="LoopPay home">
        <Image
          src="/brand/looppay-logo.webp"
          width={840}
          height={201}
          alt="LoopPay"
          className="brand-image"
        />
      </Link>
      <p>Good business comes around.</p>
      <Link href="/docs">Product, rewards & safety ↗</Link>
      <span>Built on QIE · No protocol fees in v1</span>
    </footer>
  );
}
