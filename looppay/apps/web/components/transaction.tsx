"use client";
import { explorerLink } from "@looppay/config";
import { useLoopPay, useTransaction } from "../lib/use-looppay";
export function NetworkNotice() {
  const { network, account } = useLoopPay();
  return !network ? (
    <div className="notice">
      Contracts are not configured. Set the public network variables after a
      local or testnet deployment. No payment is available until setup is
      complete.
    </div>
  ) : !account.address ? (
    <div className="notice">
      Connect a QIE-compatible injected wallet to continue. QIE Wallet must
      expose an EVM provider in this browser.
    </div>
  ) : account.chainId !== network.chainId ? (
    <div className="notice error" role="alert">
      Unsupported network. Switch to chain {network.chainId} using the wallet
      control above.
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
