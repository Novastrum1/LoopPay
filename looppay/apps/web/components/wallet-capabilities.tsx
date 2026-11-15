"use client";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { configuredNetwork } from "../lib/network";
import { Button } from "./ui/button";
export function WalletCapabilities() {
  const { chainId } = useAccount();
  const { connectors, connect, error, isPending } = useConnect();
  const { switchChain, error: switchError } = useSwitchChain();
  const network = configuredNetwork();
  return (
    <section className="panel" aria-label="Wallet capabilities">
      <h2>Wallet connection and eligibility</h2>
      <p>
        Current chain: {chainId ?? "Not connected"} · Required chain:{" "}
        {network?.chainId ?? "Not configured"}
      </p>
      <p>
        Detected connectors:{" "}
        {connectors.length
          ? connectors.map((c) => c.name).join(", ")
          : "No injected provider detected"}
        .
      </p>
      <div className="actions">
        {connectors.map((c) => (
          <Button
            key={c.uid}
            variant="outline"
            disabled={isPending || !network}
            onClick={() => connect({ connector: c })}
          >
            Connect {c.name}
          </Button>
        ))}
      </div>
      {network && chainId && chainId !== network.chainId ? (
        <Button onClick={() => switchChain({ chainId: network.chainId })}>
          Switch to required network
        </Button>
      ) : null}
      {error || switchError ? (
        <p role="alert">
          Wallet request rejected or unavailable. Check your wallet network
          settings and try again.
        </p>
      ) : null}
      <p>
        Mobile deep links and QIE Wallet desktop/mobile support are unverified.
        Open this page in an injected EVM wallet browser; if no provider
        appears, use a compatible browser extension. Never share wallet recovery
        information.
      </p>
      <p>
        QIE ID verification is not configured on this deployment.
        Identity-required campaigns cannot award rewards. Open campaigns follow
        their on-chain policy.
      </p>
    </section>
  );
}
