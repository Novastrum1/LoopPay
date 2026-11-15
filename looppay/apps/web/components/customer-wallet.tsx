"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, keccak256, toBytes } from "viem";
import { tokenAmount } from "@looppay/sdk";
import { useLoopPay, useTransaction } from "../lib/use-looppay";
import { NetworkNotice, TransactionState } from "./transaction";
import { Button } from "./ui/button";
import { useDemo } from "./demo";
import { parseMetadata } from "../lib/forms";
type Activity = {
  earnings: { campaignId: string; amount: string; name?: string }[];
  partners: {
    id: string;
    name: string;
    location?: string;
    category?: string;
  }[];
};
export function CustomerWallet() {
  const { sdk, network, account, ready } = useLoopPay();
  const demo = useDemo();
  const tx = useTransaction();
  const [source, setSource] = useState("");
  const [shop, setShop] = useState("");
  const [amount, setAmount] = useState("");
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [spent, setSpent] = useState(0);
  const activity = useQuery({
    queryKey: ["wallet-activity", account.address],
    enabled: !!network && !!account.address && !demo,
    queryFn: async () => {
      const r = await fetch(`/api/activity?customer=${account.address}`);
      if (!r.ok) throw Error("History unavailable");
      return r.json() as Promise<Activity>;
    },
    refetchInterval: 15000,
  });
  const ids = [
    ...new Set(activity.data?.earnings.map((e) => e.campaignId) ?? []),
  ];
  const balances = useQuery({
    queryKey: ["reward-balances", account.address, ids.join(",")],
    enabled: !!sdk && !!account.address && ids.length > 0 && !demo,
    queryFn: () =>
      Promise.all(
        ids.map(async (id) => {
          const campaign = await sdk!.getCampaign(BigInt(id));
          const merchant = await sdk!.getMerchant(campaign[0]);
          const name = parseMetadata(merchant[2]).name ?? "LoopPay shop";
          return {
            id,
            name,
            balance: await sdk!.getBalance(BigInt(id), account.address!),
          };
        }),
      ),
    refetchInterval: 10000,
  });
  const rewards = demo
    ? [
        {
          id: "demo-campaign",
          name: "Demo Corner Café",
          balance: BigInt(Math.round((12.5 - spent) * 1e6)),
        },
      ]
    : (balances.data ?? []);
  const decimals = demo ? 6 : (network?.tokenDecimals ?? 6);
  const symbol = demo ? "demo credits" : (network?.tokenSymbol ?? "credits");
  const partners = demo
    ? [
        {
          id: "demo-shop-1",
          name: "Demo Market Basket",
          location: "Kaduna",
          category: "Groceries",
        },
        {
          id: "demo-shop-2",
          name: "Demo Paper & Co.",
          location: "Lagos",
          category: "Stationery",
        },
      ]
    : (activity.data?.partners ?? []);
  const selected = rewards.find((r) => r.id === (source || rewards[0]?.id));
  const recipient = partners.find((p) => p.id === shop);
  const knownBalance =
    demo ||
    (!!account.address &&
      activity.isSuccess &&
      (ids.length === 0 || balances.isSuccess));
  const total = rewards.reduce((v, r) => v + r.balance, 0n);
  function validate() {
    if (!selected || !recipient)
      throw Error("Choose where your rewards were earned and a partner shop.");
    let value: bigint;
    try {
      value = tokenAmount(amount, decimals);
    } catch {
      throw Error(
        `Enter an amount greater than zero, with up to ${decimals} decimal places.`,
      );
    }
    if (value > selected.balance)
      throw Error(
        `You have ${formatUnits(selected.balance, decimals)} ${symbol} from this shop. Enter a smaller amount.`,
      );
    return value;
  }
  async function spend() {
    setError("");
    try {
      const value = validate();
      if (demo) {
        setSpent((v) => v + Number(amount));
        setMessage(
          `Demo complete: ${amount} demo credits spent at ${recipient!.name}. No real payment was made.`,
        );
      } else {
        if (!sdk || !ready) return;
        await tx.run(() =>
          sdk.redeem(
            BigInt(selected!.id),
            BigInt(shop),
            value,
            keccak256(toBytes(crypto.randomUUID())),
          ),
        );
      }
      setReview(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to spend. Check your connection and try again.",
      );
    }
  }
  return (
    <div className="workspace">
      <span className="eyebrow">MY REWARDS {demo ? "/ DEMO DATA" : ""}</span>
      <h1>Your next local find starts here.</h1>
      <p className="lead">
        Earn at one shop. Spend at another participating shop in the Loop.
      </p>
      <NetworkNotice />
      <section className="reward-card" aria-label="Reward balance">
        <p>{demo ? "Demo reward balance" : "Your reward balance"}</p>
        <div className="reward-total">
          <span className="coin" aria-hidden="true">
            L
          </span>
          {!knownBalance ? "—" : formatUnits(total, decimals)}
        </div>
        <p>{symbol} · Rewards are for spending at partner shops.</p>
      </section>
      {activity.isLoading || balances.isLoading ? (
        <p role="status">Loading your rewards…</p>
      ) : null}
      {activity.error || balances.error ? (
        <div className="notice" role="status">
          We couldn’t load your rewards. Check your connection and try again.
          History also needs the LoopPay indexing service.
        </div>
      ) : null}
      <div className="grid-two">
        <section className="panel">
          <h2>Where you earned them</h2>
          {rewards.length ? (
            <ul className="history">
              {rewards.map((r) => (
                <li key={r.id}>
                  <strong>{r.name}</strong>
                  <p>
                    {formatUnits(r.balance, decimals)} {symbol} available
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">
              {!demo && (activity.error || balances.error)
                ? "Your reward sources are unavailable. Check your connection and try again."
                : !demo && !account.address
                  ? "Connect your wallet to see where you earned rewards."
                  : "Pay at a LoopPay shop to earn your first reward"}
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Spend rewards</h2>
          <p>
            The shop receives payment from the reserve that funded your rewards.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setMessage("");
              try {
                validate();
                setReview(true);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Check the amount.",
                );
              }
            }}
          >
            <label className="field">
              Use rewards earned at
              <select
                value={source || rewards[0]?.id || ""}
                onChange={(e) => {
                  setSource(e.target.value);
                  setReview(false);
                }}
              >
                <option value="" disabled>
                  Choose a reward balance
                </option>
                {rewards.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {formatUnits(r.balance, decimals)} available
                  </option>
                ))}
              </select>
            </label>
            <h3>Choose a partner shop</h3>
            {partners.length ? (
              <div className="shop-grid">
                {partners.map((p) => (
                  <button
                    className="shop"
                    type="button"
                    key={p.id}
                    aria-pressed={shop === p.id}
                    onClick={() => {
                      setShop(p.id);
                      setReview(false);
                    }}
                  >
                    <strong>{p.name}</strong>
                    <span>
                      {p.location || "Area not published"} ·{" "}
                      {p.category || "Category not published"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">No partner shops available yet.</div>
            )}
            <label className="field">
              Amount ({symbol})
              <input
                inputMode="decimal"
                value={amount}
                required
                onChange={(e) => {
                  setAmount(e.target.value);
                  setReview(false);
                }}
                placeholder="0.00"
              />
            </label>
            <Button
              disabled={
                (!demo && !ready) ||
                tx.busy ||
                !rewards.length ||
                !partners.length
              }
            >
              Spend rewards
            </Button>
          </form>
          {review ? (
            <section className="notice" aria-label="Confirm reward payment">
              <h3>Review your payment</h3>
              <p>
                <strong>{recipient?.name}</strong>
                <br />
                {amount} {symbol}
                <br />
                Network:{" "}
                {demo
                  ? "QIE Testnet simulation"
                  : network?.chainId === 1983
                    ? "QIE Testnet"
                    : network?.chainId === 31337
                      ? "Local Anvil"
                      : `QIE (${network?.chainId})`}
              </p>
              <p>
                Payments to shops are final and cannot be reversed.{" "}
                {demo
                  ? "This is a demo. No real payment will be made."
                  : "Network gas fees apply."}
              </p>
              <div className="actions">
                <Button onClick={spend} disabled={tx.busy}>
                  {demo ? "Confirm demo spend" : "Confirm payment"}
                </Button>
                <Button variant="outline" onClick={() => setReview(false)}>
                  Go back
                </Button>
              </div>
            </section>
          ) : null}
          <div aria-live="polite">
            {error ? (
              <p className="notice error" role="alert">
                {error}
              </p>
            ) : null}
            {message ? <p className="notice success">{message}</p> : null}
          </div>
          <TransactionState state={tx.state} />
          <details>
            <summary>Advanced details</summary>
            <p>
              Reward source: {selected?.id || "None selected"}
              <br />
              Recipient: {shop || "None selected"}
              <br />
              Network: {network?.chainId ?? "Demo simulation"}
            </p>
            <p>
              Each payment uses one campaign’s balance. Partner eligibility and
              available rewards are checked on-chain before a real payment.
            </p>
          </details>
        </section>
      </div>
    </div>
  );
}
