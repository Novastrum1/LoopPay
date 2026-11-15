"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useDemo } from "./demo-context";
const WalletButton = dynamic(
  () => import("./wallet").then((m) => m.WalletButton),
  { ssr: false, loading: () => <span className="pill">Opening wallet…</span> },
);
export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const demo = useDemo();
  return (
    <header>
      <Link prefetch={false} href="/" aria-label="LoopPay home">
        <Image
          src="/brand/looppay-logo.webp"
          width={840}
          height={201}
          alt="LoopPay"
          className="brand-image"
          priority
        />
      </Link>
      <button
        className="button outline menu-toggle"
        aria-expanded={open}
        aria-controls="main-nav"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
        <span>Menu</span>
      </button>
      <nav
        id="main-nav"
        className={open ? "open" : ""}
        aria-label="Main navigation"
      >
        {[
          ["/merchant", "For merchants"],
          ["/wallet", "My rewards"],
          ["/docs", "How it works"],
        ].map(([href, label]) => (
          <Link
            prefetch={false}
            onClick={() => setOpen(false)}
            key={href}
            href={href}
          >
            {label}
          </Link>
        ))}
      </nav>
      {path === "/" || path === "/docs" ? (
        <div className="wallet-control">
          {demo ? (
            <span className="pill">Demo mode</span>
          ) : (
            <Link prefetch={false} className="button" href="/merchant">
              Open app ↗
            </Link>
          )}
        </div>
      ) : (
        <WalletButton />
      )}
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
      ].map(([href, label]) => (
        <Link prefetch={false} key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function Footer() {
  return (
    <footer>
      <Link prefetch={false} href="/" aria-label="LoopPay home">
        <Image
          src="/brand/looppay-logo.webp"
          width={840}
          height={201}
          alt="LoopPay"
          className="brand-image"
        />
      </Link>
      <div className="footer-links">
        <a href="https://github.com/Novastrum1/LoopPay">GitHub ↗</a>
        <a href="https://github.com/Novastrum1/LoopPay/issues/new">Contact ↗</a>
        <Link prefetch={false} href="/docs">
          How it works
        </Link>
      </div>
      <span>Built on QIE · No protocol fees in v1</span>
    </footer>
  );
}
