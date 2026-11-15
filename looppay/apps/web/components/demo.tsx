"use client";
import { type ReactNode } from "react";
import { DemoContext, DeploymentContext } from "./demo-context";
export { useDemo, useDeploymentReady } from "./demo-context";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { configuredNetwork } from "../lib/network";
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
          <div className="demo-banner" role="status">
            The payment network is unavailable. Check your connection and try
            again.
          </div>
        ) : (
          <div className="demo-banner" role="status">
            {check.data === true
              ? "Connected to the configured payment network."
              : "Checking the payment network…"}
          </div>
        )}
        {children}
      </DeploymentContext.Provider>
    </DemoContext.Provider>
  );
}
