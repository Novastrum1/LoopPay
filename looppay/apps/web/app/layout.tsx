import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "../components/providers";
import { Header, Footer } from "../components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "LoopPay — Stablecoin checkout & shared rewards", template: "%s | LoopPay" },
  openGraph: { title: "LoopPay", description: "Stablecoin checkout and shared rewards for local businesses, built on QIE.", images: ["/brand/looppay-logo.webp"], type: "website" },
  description:
    "Direct stablecoin checkout and a shared loyalty network for independent merchants on QIE.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Providers>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
