"use client";
import { useDemo, useDeploymentReady } from "../components/demo";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoopPaySDK } from "@looppay/sdk";
import { configuredNetwork } from "./network";
import type { Hash, TransactionReceipt } from "viem";
export function useLoopPay() {
  const demo = useDemo();
  const deploymentReady = useDeploymentReady();
  const account = useAccount();
  const client = usePublicClient();
  const { data: wallet } = useWalletClient();
  const network = useMemo(() => configuredNetwork(), []);
  const sdk = useMemo(
    () =>
      !demo && network && client
        ? new LoopPaySDK(network, client, wallet)
        : null,
    [network, client, wallet, demo],
  );
  return {
    sdk,
    network,
    account,
    ready:
      !demo &&
      deploymentReady &&
      !!network &&
      !!account.address &&
      account.chainId === network.chainId,
  };
}
export function useTransaction() {
  const { sdk } = useLoopPay();
  const query = useQueryClient();
  const [state, setState] = useState<{
    phase: "idle" | "signing" | "pending" | "confirmed" | "error";
    hash?: Hash;
    message?: string;
  }>({ phase: "idle" });
  async function run(
    action: () => Promise<Hash>,
    after?: (receipt: TransactionReceipt) => void | Promise<void>,
  ) {
    if (!sdk) return;
    setState({ phase: "signing" });
    try {
      const hash = await action();
      setState({ phase: "pending", hash });
      const receipt = await sdk.confirmed(hash);
      setState({ phase: "confirmed", hash });
      await query.invalidateQueries();
      await after?.(receipt);
    } catch (error) {
      const rejected =
        error instanceof Error && /reject|denied/i.test(error.message);
      setState({
        phase: "error",
        message: rejected
          ? "You rejected the wallet request. Nothing was confirmed."
          : error instanceof Error
            ? "The transaction could not be confirmed. Check your wallet history and network connection before trying again."
            : "Transaction failed. Check your wallet and try again.",
      });
    }
  }
  return {
    state,
    run,
    busy: state.phase === "signing" || state.phase === "pending",
  };
}
