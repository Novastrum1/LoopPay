"use client";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, keccak256, toBytes } from "viem";
import { z } from "zod";
import { tokenAmount } from "@looppay/sdk";
import { useLoopPay, useTransaction } from "../lib/use-looppay";
import { NetworkNotice, TransactionState } from "./transaction";
import { Field } from "./field";
import { Button } from "./ui/button";
import Link from "next/link";
type Activity = {
  payments: { id: string; amount: string; transactionHash: string }[];
  earnings: { campaignId: string; amount: string }[];
  redemptions: {
    campaignId: string;
    merchantId: string;
    amount: string;
    transactionHash: string;
  }[];
  partners: { id: string; name: string }[];
};
export function CustomerWallet() {
  const { sdk, network, account, ready } = useLoopPay();
  const tx = useTransaction();
  const [error, setError] = useState("");
  const activity = useQuery({
    queryKey: ["wallet-activity", account.address],
    enabled: !!account.address,
    queryFn: async () => {
      const r = await fetch(`/api/activity?customer=${account.address}`);
      if (!r.ok) throw new Error("History unavailable");
      return r.json() as Promise<Activity>;
    },
    refetchInterval: 15000,
  });
  const ids = [
    ...new Set(activity.data?.earnings.map((e) => e.campaignId) ?? []),
  ];
  const balances = useQuery({
    queryKey: ["balances", account.address, ids.join(",")],
    enabled: !!sdk && !!account.address && ids.length > 0,
    queryFn: () =>
      Promise.all(
        ids.map(async (id) => ({
          id,
          balance: await sdk!.getBalance(BigInt(id), account.address!),
          campaign: await sdk!.getCampaign(BigInt(id)),
        })),
      ),
    refetchInterval: 10000,
  });
  async function redeem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      if (!sdk || !network) return;
      const v = z
        .object({
          campaign: z.string().regex(/^[1-9]\d*$/),
          merchant: z.string().regex(/^[1-9]\d*$/),
          amount: z.string(),
        })
        .parse(Object.fromEntries(new FormData(e.currentTarget)));
      const amount = tokenAmount(v.amount, network.tokenDecimals);
      const nonce = keccak256(toBytes(crypto.randomUUID()));
      await tx.run(() =>
        sdk.redeem(BigInt(v.campaign), BigInt(v.merchant), amount, nonce),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid redemption");
    }
  }
  return (
    <div className="workspace">
      <span className="eyebrow">YOUR PERSONAL LOOP</span>
      <h1>Little purchases. Lovely possibilities.</h1>
      <p className="lead">
        Your loyalty credits stay with your wallet. Spend them with
        participating neighbors and keep the good going.
      </p>
      <NetworkNotice />
      {activity.isLoading ? (
        <p role="status">Loading your public wallet activity…</p>
      ) : null}
      {activity.error ? (
        <div className="notice">
          History needs the event indexer. On-chain reward balances remain
          redeemable even when indexing is unavailable.
        </div>
      ) : null}
      <section className="panel">
        <h2>Your reward credits</h2>
        {balances.isLoading ? (
          <p>Reading on-chain balances…</p>
        ) : !balances.data?.length ? (
          <div className="empty">
            Your first reward is one checkout away. Open a merchant invoice to
            start earning.
          </div>
        ) : (
          <div className="metrics">
            {balances.data.map((b) => (
              <div className="metric" key={b.id}>
                <span>
                  Campaign #{b.id} ·{" "}
                  {b.campaign[9] ? "Earning enabled" : "Earning paused"}
                </span>
                <strong>
                  {network
                    ? formatUnits(b.balance, network.tokenDecimals)
                    : "—"}
                </strong>
                <span>{network?.tokenSymbol} · non-transferable credits</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="grid-two">
        <section className="panel">
          <h2>Use a little good.</h2>
          <p className="small">
            Confirm the recipient merchant ID with the shop. Redemption sends
            the issuing campaign’s stablecoin reserve directly to that shop’s
            payout wallet. It cannot be reversed.
          </p>
          <form onSubmit={redeem}>
            <Field
              name="campaign"
              label="Issuing campaign ID"
              required
              inputMode="numeric"
            />
            <Field
              name="merchant"
              label="Recipient merchant ID"
              required
              inputMode="numeric"
            />
            <Field
              name="amount"
              label={`Amount (${network?.tokenSymbol ?? "stablecoin"})`}
              required
              inputMode="decimal"
            />
            <Button disabled={!ready || tx.busy}>Redeem reward</Button>
          </form>
          {error ? (
            <div className="notice error" role="alert">
              {error}
            </div>
          ) : null}
          <TransactionState state={tx.state} />
        </section>
        <section className="panel">
          <h2>In the neighborhood</h2>
          <p className="small">
            Eligible Loop Network partners, from indexed opt-in events.
            Participation is checked on-chain at redemption.
          </p>
          {activity.data?.partners.length ? (
            <ul className="history">
              {activity.data.partners.map((p) => (
                <li key={p.id}>
                  {p.name} <span className="pill">Merchant #{p.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">No participating partners indexed yet.</div>
          )}
        </section>
      </div>
      <div className="grid-two">
        <section className="panel">
          <h2>Your payment history</h2>
          {activity.data?.payments.length ? (
            <ul className="history">
              {activity.data.payments.map((p) => (
                <li key={p.id}>
                  <Link href={`/receipt/${p.id}`}>Invoice #{p.id} ↗</Link> ·{" "}
                  {network
                    ? formatUnits(BigInt(p.amount), network.tokenDecimals)
                    : p.amount}{" "}
                  {network?.tokenSymbol}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">No payments indexed for this wallet.</div>
          )}
        </section>
        <section className="panel">
          <h2>Rewards put to good use</h2>
          {activity.data?.redemptions.length ? (
            <ul className="history">
              {activity.data.redemptions.map((r, i) => (
                <li key={r.transactionHash + i}>
                  Campaign #{r.campaignId} → Merchant #{r.merchantId}
                  <br />
                  {network
                    ? formatUnits(BigInt(r.amount), network.tokenDecimals)
                    : r.amount}{" "}
                  {network?.tokenSymbol}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              Your redemption history will appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
