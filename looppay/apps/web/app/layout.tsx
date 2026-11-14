import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "../components/providers";
import { Header, Footer } from "../components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "LoopPay — Good business comes around",
  description:
    "Direct stablecoin checkout and a shared loyalty network for independent merchants on QIE.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
