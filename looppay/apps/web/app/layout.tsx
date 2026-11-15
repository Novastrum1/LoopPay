import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RouteProviders } from "../components/route-providers";
import { configuredNetwork } from "../lib/network";
import { Header, Footer } from "../components/shell";
import "./globals.css";
function appOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}
export const metadata: Metadata = {
  metadataBase: appOrigin(),
  title: {
    default: "LoopPay — Stablecoin checkout & shared rewards",
    template: "%s | LoopPay",
  },
  openGraph: {
    title: "LoopPay",
    description:
      "Stablecoin checkout and shared rewards for local businesses, built on QIE.",
    images: ["/brand/looppay-logo.webp"],
    type: "website",
  },
  description:
    "Direct stablecoin checkout and a shared loyalty network for independent merchants on QIE.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/brand/figtree-variable.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://cdn.fontshare.com/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <RouteProviders initialDemo={!configuredNetwork()}>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </RouteProviders>
      </body>
    </html>
  );
}
