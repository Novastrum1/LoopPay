"use client";
import { createContext, useContext, type ReactNode } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { configuredNetwork } from "../lib/network";
const DemoContext = createContext(false);
const DeploymentContext = createContext(false);
export function useDeploymentReady() {
  return useContext(DeploymentContext);
}
export function useDemo() {
  return useContext(DemoContext);
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const network = configuredNetwork();
  const client = usePublicClient();
  const check = useQuery({
    queryKey: [
      "deployment-check",
      network?.chainId,
      network?.registry,
      network?.checkout,
      network?.rewards,
      network?.token,
    ],
    enabled: !!network && !!client,
    queryFn: async () => {
      const codes = await Promise.all(
        [
          network!.registry,
          network!.checkout,
          network!.rewards,
          network!.token,
        ].map((address) => client!.getBytecode({ address })),
      );
      return codes.every((code) => !!code && code !== "0x");
    },
    retry: 1,
    staleTime: 60000,
  });
  const demo = !network || check.data === false;
  return (
    <DemoContext.Provider value={demo}>
      <DeploymentContext.Provider value={check.data === true && !check.error}>
        {demo ? (
          <div className="demo-banner" role="status">
            <strong>Demo mode</strong>You are viewing demo data. No real
            payments are made.
          </div>
        ) : check.error ? (
          <div className="notice" role="status">
            The payment network is unavailable. Check your connection and try
            again.
          </div>
        ) : null}
        {children}
      </DeploymentContext.Provider>
    </DemoContext.Provider>
  );
}
