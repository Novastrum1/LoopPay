"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useDemo } from "./demo";
import { Wallet } from "lucide-react";
import { configuredNetwork } from "../lib/network";
import { Button } from "./ui/button";
export function WalletButton() {
  const { address, chainId } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const n = configuredNetwork();
  const demo = useDemo();
  if (demo || !n)
    return (
      <span className="pill">
        {process.env.NODE_ENV === "development"
          ? "Demo mode · Local setup required"
          : "Demo mode"}
      </span>
    );
  return (
    <div className="wallet-control">
      {address ? (
        <>
          <span className="pill">
            {n.chainId === 1983
              ? "QIE Testnet"
              : n.chainId === 31337
                ? "Local Anvil"
                : "QIE"}{" "}
            · {address.slice(0, 6)}…{address.slice(-4)}
          </span>
          {chainId !== n.chainId ? (
            <Button onClick={() => switchChain({ chainId: n.chainId })}>
              Wrong network · Switch
            </Button>
          ) : (
            <Button variant="outline" onClick={() => disconnect()}>
              Disconnect
            </Button>
          )}
        </>
      ) : (
        <Button
          disabled={isPending || !connectors.length}
          onClick={() => connect({ connector: connectors[0] })}
        >
          <Wallet size={16} />
          {isPending ? "Connecting…" : "Connect wallet"}
        </Button>
      )}
      {error ? (
        <span role="alert">
          Wallet connection rejected or unavailable. Try again.
        </span>
      ) : null}
    </div>
  );
}
