"use client";
import { useSwitchChain } from "wagmi";
import { useDemo } from "./demo";
import { Button } from "./ui/button";
import { explorerLink } from "@looppay/config";
import { useLoopPay, useTransaction } from "../lib/use-looppay";
export function NetworkNotice() {
  const { network, account } = useLoopPay();
  const demo = useDemo();
  const { switchChain, error, isPending } = useSwitchChain();
  if (demo) return null;
  return !network ? null : !account.address ? (
    <div className="notice" role="status">
      Connect your wallet above to view your rewards or make a payment.
    </div>
  ) : account.chainId !== network.chainId ? (
    <div className="notice" role="alert">
      <p>
        Wrong network. Switch to{" "}
        {network.chainId === 1983
          ? "QIE Testnet"
          : network.chainId === 31337
            ? "Local Anvil"
            : "QIE"}{" "}
        to continue.
      </p>
      <Button
        disabled={isPending}
        onClick={() => switchChain({ chainId: network.chainId })}
      >
        {isPending ? "Switching…" : "Switch network"}
      </Button>
      {error ? (
        <p>Open your wallet and approve the network change, then try again.</p>
      ) : null}
    </div>
  ) : null;
}
export function TransactionState({
  state,
}: {
  state: ReturnType<typeof useTransaction>["state"];
}) {
  const { network } = useLoopPay();
  const link = state.hash
    ? explorerLink(network?.explorerUrl, state.hash)
    : undefined;
  if (state.phase === "idle") return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`notice ${state.phase === "error" ? "error" : state.phase === "confirmed" ? "success" : ""}`}
    >
      {state.phase === "signing"
        ? "Review and confirm the request in your wallet."
        : state.phase === "pending"
          ? "Transaction submitted. Waiting for two confirmations…"
          : state.phase === "confirmed"
            ? "Transaction confirmed."
            : state.message}
      {link ? (
        <>
          <br />
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="link-break"
          >
            View transaction ↗
          </a>
        </>
      ) : null}
    </div>
  );
}
