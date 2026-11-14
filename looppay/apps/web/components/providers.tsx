"use client";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { anvil } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { chainFor } from "@looppay/config";
import { configuredNetwork } from "../lib/network";
export function Providers({ children }: { children: ReactNode }) {
  const [query] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 2, staleTime: 10000 } },
      }),
  );
  const [config] = useState(() => {
    const n = configuredNetwork();
    const chain = n ? chainFor(n) : anvil;
    return createConfig({
      chains: [chain],
      connectors: [injected()],
      transports: { [chain.id]: http(n?.rpcUrl) },
      ssr: true,
    });
  });
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={query}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
