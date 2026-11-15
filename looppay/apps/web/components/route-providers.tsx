"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { DemoContext } from "./demo-context";
const WalletProviders = dynamic(
  () => import("./providers").then((m) => m.Providers),
  {
    loading: () => (
      <p className="notice" role="status">
        Opening your wallet workspace…
      </p>
    ),
  },
);
export function RouteProviders({
  children,
  initialDemo,
}: {
  children: ReactNode;
  initialDemo: boolean;
}) {
  const path = usePathname();
  if (path === "/" || path === "/docs")
    return (
      <DemoContext.Provider value={initialDemo}>
        {initialDemo ? (
          <div className="demo-banner" role="status">
            <strong>Demo mode</strong>You are viewing demo data. No real
            payments are made.
          </div>
        ) : null}
        {children}
      </DemoContext.Provider>
    );
  return <WalletProviders>{children}</WalletProviders>;
}
