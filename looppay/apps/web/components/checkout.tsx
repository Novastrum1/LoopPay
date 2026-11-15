"use client";
import { useDemo } from "./demo";
import { DemoCheckout } from "./demo-checkout";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, decodeEventLog } from "viem";
import { rewardsAbi, checkoutAbi } from "@looppay/sdk";
import { explorerLink } from "@looppay/config";
import Link from "next/link";
import { useLoopPay, useTransaction } from "../lib/use-looppay";
import { parseMetadata } from "../lib/forms";
import { NetworkNotice, TransactionState } from "./transaction";
import { Button } from "./ui/button";
export function Checkout({
  invoiceId,
  receipt = false,
  displayLabel,
}: {
  invoiceId: string;
  receipt?: boolean;
  displayLabel?: string;
}) {
  const { sdk, network, account, ready } = useLoopPay();
  const tx = useTransaction();
  const demo = useDemo();
  const [review, setReview] = useState(false);
  const router = useRouter();
  const [approval, setApproval] = useState(false);
  const valid = /^[1-9]\d*$/.test(invoiceId);
  const invoice = useQuery({
    queryKey: ["invoice", invoiceId],
    enabled: !!sdk && valid,
    queryFn: () => sdk!.getInvoice(BigInt(invoiceId)),
    refetchInterval: 10000,
  });
  const i = invoice.data;
  const merchant = useQuery({
    queryKey: ["merchant-record", i?.[1].toString()],
    enabled: !!sdk && !!i && i[0] > 0n,
    queryFn: () => sdk!.getMerchant(i![1]),
  });
  const campaign = useQuery({
    queryKey: ["campaign", i?.[6].toString()],
    enabled: !!sdk && !!i && i[6] > 0n,
    queryFn: () => sdk!.getCampaign(i![6]),
  });
  const eligibility = useQuery({
    queryKey: [
      "reward-eligibility",
      invoiceId,
      account.address,
      i?.[6].toString(),
    ],
    enabled: !!sdk && !!i,
    queryFn: async () => {
      const test = await sdk!.publicClient.readContract({
        address: network!.checkout,
        abi: checkoutAbi,
        functionName: "isTestInvoice",
        args: [BigInt(invoiceId)],
      });
      if (test)
        return "Test invoice: no rewards; excluded from production analytics.";
      if (!i![6]) return "No reward campaign attached.";
      if (!account.address)
        return "Connect your wallet to check reward eligibility.";
      const [eligible, reason] = await sdk!.publicClient.readContract({
        address: network!.rewards,
        abi: rewardsAbi,
        functionName: "rewardEligibility",
        args: [i![6], account.address],
      });
      return eligible
        ? "Wallet policy eligible. Dates, budget, and lifetime cap still apply."
        : reason === 1
          ? "Merchant owner/payout self-payment: no rewards."
          : reason === 2
            ? "QIE ID verification is not configured on this deployment. Payment remains possible; no rewards."
            : "Campaign rewards are disabled.";
    },
    refetchInterval: 10000,
  });
  const tokenSupported = useQuery({
    queryKey: ["approved-token", i?.[2]],
    enabled: !!sdk && !!i,
    queryFn: async () =>
      i![2].toLowerCase() === network!.token.toLowerCase() &&
      (await sdk!.publicClient.readContract({
        address: network!.registry,
        abi: (await import("@looppay/sdk")).registryAbi,
        functionName: "approvedTokens",
        args: [i![2]],
      })),
  });
  const allowance = useQuery({
    queryKey: ["allowance", invoiceId, account.address, approval],
    enabled: !!sdk && !!i && !!account.address,
    queryFn: () => sdk!.allowance(i![2], account.address!, network!.checkout),
  });
  const payment = useQuery({
    queryKey: ["payment-proof", invoiceId, i?.[7]],
    enabled: !!sdk && !!i && i[7] === 1,
    queryFn: async () => {
      const response = await fetch(`/api/receipt/${invoiceId}`);
      if (!response.ok) throw new Error("Receipt indexing is still pending");
      const record = (await response.json()) as {
        transactionHash: `0x${string}`;
        customer: string;
      };
      const confirmed = await sdk!.publicClient.waitForTransactionReceipt({
        hash: record.transactionHash,
        confirmations: 2,
      });
      if (confirmed.status !== "success") throw new Error("Payment reverted");
      let verified = false;
      let earned = 0n;
      for (const log of confirmed.logs) {
        if (log.address.toLowerCase() === network!.checkout.toLowerCase()) {
          try {
            const e = decodeEventLog({
              abi: checkoutAbi,
              data: log.data,
              topics: log.topics,
            });
            if (
              e.eventName === "InvoicePaid" &&
              e.args.invoiceId === BigInt(invoiceId)
            )
              verified = true;
          } catch {
            continue;
          }
        }
        if (log.address.toLowerCase() === network!.rewards.toLowerCase()) {
          try {
            const e = decodeEventLog({
              abi: rewardsAbi,
              data: log.data,
              topics: log.topics,
            });
            if (
              e.eventName === "RewardEarned" &&
              e.args.invoiceId === BigInt(invoiceId)
            )
              earned = e.args.amount;
          } catch {
            continue;
          }
        }
      }
      if (!verified)
        throw new Error("Payment event does not match this invoice");
      return { ...record, earned };
    },
    refetchInterval: 10000,
  });
  async function pay() {
    if (!sdk || !i || !network || !account.address) return;
    if ((allowance.data ?? 0n) < i[3])
      await tx.run(
        () => sdk.approve(i[2], network.checkout, i[3]),
        () => setApproval((v) => !v),
      );
    else
      await tx.run(
        () => sdk.payInvoice(BigInt(invoiceId)),
        () => {
          router.push(`/receipt/${invoiceId}`);
        },
      );
  }
  const profile = merchant.data ? parseMetadata(merchant.data[2]) : {};
  const expired = !!i && BigInt(Math.floor(Date.now() / 1000)) >= i[5];
  const c = campaign.data;
  const needsApproval = !!i && (allowance.data ?? 0n) < i[3];
  if (demo || invoiceId.startsWith("demo"))
    return <DemoCheckout id={invoiceId} />;
  return (
    <div className="checkout">
      <span className="eyebrow">
        {receipt ? "YOUR LOOPPAY RECEIPT" : "A GOOD PURCHASE STARTS HERE"}
      </span>
      <h1>
        {receipt ? "Thanks for keeping it local." : "A little everyday good."}
      </h1>
      <NetworkNotice />
      {!valid ? (
        <div className="notice error">Invalid invoice ID.</div>
      ) : invoice.isLoading ? (
        <p role="status">Loading invoice from the blockchain…</p>
      ) : invoice.error ? (
        <div className="notice error">
          Cannot load invoice. Check your network connection.
        </div>
      ) : i && i[0] === 0n ? (
        <div className="empty">
          This invoice does not exist on the configured network.
        </div>
      ) : i && network ? (
        <section className="panel">
          <span className="pill">
            {network.tokenSymbol} ·{" "}
            {network.chainId === 1983
              ? "QIE Testnet"
              : network.chainId === 31337
                ? "Local Anvil"
                : "QIE"}
          </span>
          {profile.logo ? (
            <img
              src={profile.logo}
              width={56}
              height={56}
              alt={`${profile.name ?? "Merchant"} logo`}
              referrerPolicy="no-referrer"
              className="rounded-full mt-5"
            />
          ) : null}
          <h2 className="mt-5">{profile.name ?? `Merchant #${i[1]}`}</h2>
          {displayLabel ? (
            <p className="small">
              Display label (merchant-supplied): {displayLabel.slice(0, 80)}
            </p>
          ) : null}
          <div className="checkout-amount">
            {formatUnits(i[3], network.tokenDecimals)}{" "}
            <span className="text-xl">{network.tokenSymbol}</span>
          </div>
          <p className="small">
            Always check the amount, token address, and payout wallet in your
            wallet.
          </p>
          <dl className="definition">
            <dt>Invoice</dt>
            <dd>#{invoiceId}</dd>
            <dt>Status</dt>
            <dd>
              {i[7] === 1
                ? "Paid on-chain"
                : i[7] === 2
                  ? "Cancelled"
                  : expired
                    ? "Expired"
                    : "Open"}
            </dd>
            <dt>Expires</dt>
            <dd>{new Date(Number(i[5]) * 1000).toLocaleString()}</dd>
            <dt>Token address</dt>
            <dd>{i[2]}</dd>
            <dt>Current payout wallet</dt>
            <dd>{merchant.data?.[1] ?? "Loading…"}</dd>
            <dt>Reward offer</dt>
            <dd>
              {c
                ? `${c[2]} basis points, minimum ${formatUnits(c[3], network.tokenDecimals)}, lifetime cap ${formatUnits(c[4], network.tokenDecimals)} ${network.tokenSymbol}`
                : i[6] > 0n
                  ? "Loading campaign…"
                  : "No campaign attached"}
            </dd>
          </dl>
          <p className="small">
            {profile.terms ?? "No additional merchant terms published."}
          </p>
          <p className="notice" role="status">
            {eligibility.error
              ? "Reward eligibility unavailable. Payment does not guarantee rewards."
              : (eligibility.data ?? "Checking reward eligibility…")}
          </p>
          {c ? (
            <p className="small">
              Earning depends on campaign dates, active status, remaining budget
              and your lifetime cap. Reward credits are non-transferable and
              redeemable at opted-in partners. Actual earned amount appears in
              the confirmed receipt.
            </p>
          ) : null}
          {i[7] === 0 && !receipt ? (
            <>
              <div className="notice">
                {needsApproval
                  ? "Approve only the exact invoice amount, then return to pay. Approval alone does not pay the merchant."
                  : "Ready to pay directly to the merchant. Network gas is separate."}
              </div>
              <Button
                disabled={
                  !ready ||
                  tx.busy ||
                  expired ||
                  !tokenSupported.data ||
                  allowance.isLoading
                }
                onClick={() => {
                  if (needsApproval) void pay();
                  else setReview(true);
                }}
              >
                {tx.busy
                  ? "Waiting for confirmation…"
                  : needsApproval
                    ? "Approve stablecoin"
                    : "Pay invoice"}
              </Button>
              {review && !needsApproval ? (
                <div className="notice">
                  <h3>Confirm payment</h3>
                  <p>
                    {profile.name ?? "LoopPay shop"} ·{" "}
                    {formatUnits(i[3], network.tokenDecimals)}{" "}
                    {network.tokenSymbol}
                    <br />
                    Network:{" "}
                    {network.chainId === 1983
                      ? "QIE Testnet"
                      : network.chainId === 31337
                        ? "Local Anvil"
                        : "QIE"}
                  </p>
                  <p>
                    Payments to shops are final and cannot be reversed. Network
                    gas fees apply.
                  </p>
                  <Button
                    disabled={!ready || tx.busy}
                    onClick={() => {
                      setReview(false);
                      void pay();
                    }}
                  >
                    Confirm payment
                  </Button>
                  <Button variant="outline" onClick={() => setReview(false)}>
                    Go back
                  </Button>
                </div>
              ) : null}
              {tokenSupported.data === false ? (
                <div className="notice error">
                  This token is not the configured approved stablecoin. Payment
                  is disabled.
                </div>
              ) : null}
            </>
          ) : null}
          {receipt && i[7] !== 1 ? (
            <div className="notice">
              No confirmed payment exists for this invoice.{" "}
              <Link href={`/pay/${invoiceId}`} className="text-link">
                Return to checkout
              </Link>
            </div>
          ) : null}
          {i[7] === 1 ? (
            <div className="notice success">
              {payment.data ? (
                <>
                  <strong>Payment receipt confirmed.</strong>
                  <p>
                    Earned{" "}
                    {formatUnits(payment.data.earned, network.tokenDecimals)}{" "}
                    {network.tokenSymbol} in loyalty credits.
                  </p>
                  {explorerLink(
                    network.explorerUrl,
                    payment.data.transactionHash,
                  ) ? (
                    <a
                      className="link-break"
                      href={explorerLink(
                        network.explorerUrl,
                        payment.data.transactionHash,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on-chain payment ↗
                    </a>
                  ) : (
                    <p className="link-break">
                      Transaction: {payment.data.transactionHash}
                    </p>
                  )}
                </>
              ) : (
                <>
                  Payment is recorded on-chain. Waiting for the indexer and
                  receipt confirmations before displaying the payment receipt.
                </>
              )}
              <p>
                <Link className="text-link" href="/wallet">
                  View your rewards →
                </Link>
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
      <TransactionState state={tx.state} />
    </div>
  );
}
