"use client";
import { useDemo } from "./demo";
import { DemoMerchant } from "./demo-merchant";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  formatUnits,
  getAddress,
  decodeEventLog,
  type TransactionReceipt,
} from "viem";
import {
  registryAbi,
  checkoutAbi,
  rewardsAbi,
  tokenAmount,
  hashOrder,
  type MerchantAnalytics,
} from "@looppay/sdk";
import { useLoopPay, useTransaction } from "../lib/use-looppay";
import {
  merchantSchema,
  invoiceSchema,
  campaignSchema,
  formValues,
  parseMetadata,
} from "../lib/forms";
import { NetworkNotice, TransactionState } from "./transaction";
import { Field } from "./field";
import { Button } from "./ui/button";
import { MerchantNav } from "./shell";
function eventId(
  receipt: TransactionReceipt,
  name: string,
  key: string,
): string {
  for (const log of receipt.logs) {
    try {
      const e = decodeEventLog({
        abi: [...registryAbi, ...checkoutAbi, ...rewardsAbi],
        data: log.data,
        topics: log.topics,
      });
      if (e.eventName === name)
        return String((e.args as Record<string, unknown>)[key]);
    } catch {
      continue;
    }
  }
  throw new Error("Expected event missing");
}
export function useMerchant() {
  const { sdk, account } = useLoopPay();
  return useQuery({
    queryKey: ["merchant", account.address],
    enabled: !!sdk && !!account.address,
    queryFn: async () => {
      const id = await sdk!.getMerchantId(account.address!);
      return { id, record: id > 0n ? await sdk!.getMerchant(id) : null };
    },
  });
}
export function MerchantPage({
  view,
}: {
  view:
    | "overview"
    | "invoice"
    | "campaigns"
    | "campaign-new"
    | "partners"
    | "analytics";
}) {
  const { sdk, network, ready } = useLoopPay();
  const merchant = useMerchant();
  const profileLoading =
    ready && merchant.data === undefined && !merchant.error;
  const tx = useTransaction();
  const demo = useDemo();
  const [review, setReview] = useState<Record<
    string,
    FormDataEntryValue
  > | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [qr, setQr] = useState("");
  const invoiceStatus = useQuery({
    queryKey: ["created-invoice-status", created],
    enabled: !!sdk && view === "invoice" && !!created,
    queryFn: () =>
      sdk!.getInvoice(BigInt(new URL(created).pathname.split("/").pop()!)),
    refetchInterval: 5000,
  });
  const [profileEdit, setProfileEdit] = useState(false);
  const analytics = useQuery({
    queryKey: ["analytics", merchant.data?.id.toString()],
    enabled:
      !!sdk &&
      !!merchant.data?.id &&
      (view === "overview" || view === "analytics"),
    queryFn: () => sdk!.getMerchantAnalytics("", merchant.data!.id),
    refetchInterval: 15000,
  });
  const campaigns = useQuery({
    queryKey: ["campaigns", merchant.data?.id.toString()],
    enabled: !!sdk && !!merchant.data?.id && view === "campaigns",
    queryFn: async () => {
      const response = await fetch(
        `/api/activity?merchant=${merchant.data!.id}`,
      );
      if (!response.ok) throw new Error("Indexer unavailable");
      return response.json() as Promise<{
        campaigns: {
          id: string;
          active: boolean;
          funded: string;
          earned: string;
          redeemed: string;
        }[];
      }>;
    },
    refetchInterval: 15000,
  });
  const partner = useQuery({
    queryKey: ["partner", merchant.data?.id.toString()],
    enabled: !!sdk && !!merchant.data?.id && view === "partners",
    queryFn: () =>
      sdk!.publicClient.readContract({
        address: network!.rewards,
        abi: rewardsAbi,
        functionName: "partners",
        args: [merchant.data!.id],
      }),
  });
  const titles = {
    overview: "Your merchant space.",
    invoice: "Create an invoice.",
    campaigns: "Give them a reason to return.",
    "campaign-new": "Set up a reward campaign.",
    partners: "Good neighbors make a great Loop.",
    analytics: "See the good going around.",
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCreated("");
    if (!sdk || !network || !ready) return;
    try {
      const values = formValues(e.currentTarget);
      if (view === "campaign-new")
        values.bps = String(Math.round(Number(values.percentage) * 100));
      if (
        view === "campaign-new" &&
        merchant.data?.id &&
        !profileEdit &&
        !reviewed
      ) {
        campaignSchema.parse(values);
        setReview(values);
        return;
      }
      setReviewed(false);
      if (!merchant.data?.id || profileEdit) {
        const v = merchantSchema.parse(values);
        await tx.run(
          () =>
            profileEdit
              ? sdk.updateMerchant(
                  merchant.data!.id,
                  getAddress(v.payout),
                  JSON.stringify(v),
                )
              : sdk.createMerchant(getAddress(v.payout), JSON.stringify(v)),
          () => {
            setProfileEdit(false);
          },
        );
      } else if (view === "invoice") {
        const v = invoiceSchema.parse(values);
        const appUrl = new URL(
          process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
        );
        const input = {
          merchantId: merchant.data.id,
          token: network.token,
          amount: tokenAmount(v.amount, network.tokenDecimals),
          orderReferenceHash: hashOrder(v.reference),
          expiresAt: BigInt(Math.floor(Date.parse(v.expires) / 1000)),
          campaignId: BigInt(v.campaign),
        };
        await tx.run(
          () => sdk.createInvoice(input),
          async (receipt) => {
            const id = eventId(receipt, "InvoiceCreated", "invoiceId");
            const url = new URL(`/pay/${id}`, appUrl);
            url.searchParams.set("label", v.label);
            setCreated(url.toString());
            const QR = await import("qrcode");
            setQr(
              await QR.toDataURL(url.toString(), {
                width: 460,
                margin: 2,
                errorCorrectionLevel: "M",
              }),
            );
          },
        );
      } else if (view === "campaign-new") {
        const v = campaignSchema.parse(values);
        const budget = tokenAmount(v.budget, network.tokenDecimals);
        const input = {
          merchantId: merchant.data.id,
          token: network.token,
          bps: BigInt(v.bps),
          minPurchase:
            v.minimum === "0"
              ? 0n
              : tokenAmount(v.minimum, network.tokenDecimals),
          cap: tokenAmount(v.cap, network.tokenDecimals),
          start: BigInt(Math.floor(Date.parse(v.start) / 1000)),
          end: BigInt(Math.floor(Date.parse(v.end) / 1000)),
        };
        await tx.run(
          () => sdk.createCampaign(input),
          (receipt) => {
            setCampaignId(eventId(receipt, "CampaignCreated", "campaignId"));
            setCreated(budget.toString());
          },
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check the form values");
    }
  }
  async function fund(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      if (!sdk || !network) return;
      const v = formValues(e.currentTarget);
      const id = BigInt(String(v.id));
      if (id <= 0n) throw new Error("Enter a campaign ID");
      const amount = tokenAmount(String(v.amount), network.tokenDecimals);
      const allowance = await sdk.allowance(
        network.token,
        sdk.wallet!.account!.address,
        network.rewards,
      );
      if (allowance < amount)
        await tx.run(() => sdk.approve(network.token, network.rewards, amount));
      else await tx.run(() => sdk.fundCampaign(id, amount));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Funding failed");
    }
  }
  const profile = merchant.data?.record
    ? parseMetadata(merchant.data.record[2])
    : undefined;
  if (demo) return <DemoMerchant view={view} />;
  return (
    <div className="workspace">
      <MerchantNav />
      <span className="eyebrow">MERCHANT SPACE / {view.replace("-", " ")}</span>
      <h1>{titles[view]}</h1>
      <NetworkNotice />
      {profileLoading ? (
        <p role="status">Loading your merchant profile…</p>
      ) : null}
      {merchant.error ? (
        <div className="notice error">
          We couldn’t load your shop. Check your connection and try again.
        </div>
      ) : null}
      {profileLoading ? null : !merchant.data?.id || profileEdit ? (
        <section className="panel">
          <h2>{profileEdit ? "Update your shop" : "Let’s meet your shop."}</h2>
          <p className="small">
            Your connected wallet owns this profile. Business details and terms
            are public on-chain; never include customer information.
          </p>
          <form onSubmit={submit}>
            <div className="grid-two">
              <Field
                name="name"
                label="Business name"
                required
                defaultValue={profile?.name}
              />
              <Field
                name="logo"
                label="Logo URL (HTTPS, optional)"
                type="url"
                defaultValue={profile?.logo}
              />
              <Field
                name="category"
                label="Category"
                required
                defaultValue={profile?.category}
              />
              <Field
                name="country"
                label="Country"
                required
                defaultValue={profile?.country}
              />
              <Field
                name="location"
                label="City / location"
                defaultValue={profile?.location}
              />
              <Field
                name="payout"
                label="Payout wallet"
                required
                defaultValue={merchant.data?.record?.[1]}
              />
            </div>
            <div className="field">
              <label htmlFor="terms">Customer reward terms</label>
              <textarea
                name="terms"
                id="terms"
                required
                minLength={10}
                maxLength={1000}
                defaultValue={
                  profile?.terms ??
                  "Rewards are non-transferable stablecoin credits redeemable at opted-in Loop Network merchants. No cash withdrawal. Campaign availability is subject to its funded reserve."
                }
              />
            </div>
            <Button disabled={!ready || tx.busy}>Save merchant profile</Button>
          </form>
        </section>
      ) : (
        <>
          <div className="pill">
            {profile?.name ?? `Merchant #${merchant.data.id}`} · Profile #
            {merchant.data.id.toString()}
          </div>
          {view === "overview" ? (
            <>
              <div className="actions">
                <Button asChild>
                  <Link href="/merchant/invoices/new">Create invoice ↗</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/merchant/campaigns/new">
                    Create a reward campaign
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setProfileEdit(true)}>
                  Edit profile & payout
                </Button>
              </div>
              <Analytics
                data={analytics.data}
                loading={analytics.isLoading}
                error={!!analytics.error}
              />
              <InvoiceHistory merchantId={merchant.data.id.toString()} />
            </>
          ) : null}
          {view === "analytics" ? (
            <Analytics
              data={analytics.data}
              loading={analytics.isLoading}
              error={!!analytics.error}
            />
          ) : null}
          {view === "invoice" ? (
            <section className="panel">
              <h2>A shareable checkout, ready in a moment.</h2>
              <p className="small">
                Payment token: {network?.tokenSymbol} · Chain {network?.chainId}
                . The display label is informational; the contract amount is
                authoritative.
              </p>
              <form onSubmit={submit}>
                <div className="grid-two">
                  <Field
                    name="label"
                    label="Short description"
                    placeholder="USD · Lunch for two"
                    required
                  />
                  <Field
                    name="amount"
                    label={`Amount (${network?.tokenSymbol ?? "stablecoin"})`}
                    inputMode="decimal"
                    required
                  />
                  <Field
                    name="reference"
                    label="Order reference"
                    hint="Only its hash goes on-chain. Avoid personal information."
                    required
                  />
                  <Field
                    name="expires"
                    label="Invoice expiry"
                    type="datetime-local"
                    required
                  />
                  <Field
                    name="campaign"
                    label="Reward campaign ID"
                    defaultValue="0"
                    hint="Use 0 for no reward offer."
                    required
                  />
                </div>
                <Button disabled={!ready || tx.busy}>Create invoice</Button>
              </form>
              {created ? (
                <div className="notice success">
                  <p role="status" aria-live="polite">
                    {invoiceStatus.data?.[7] === 1
                      ? "Paid on-chain. Verify the receipt before delivering goods."
                      : invoiceStatus.error
                        ? "Payment status unavailable. Open the checkout link to check again."
                        : "Waiting for payment. Share this public checkout URL."}
                  </p>
                  <a className="link-break" href={created}>
                    {created}
                  </a>
                  {qr ? (
                    <>
                      <img
                        className="qr"
                        src={qr}
                        alt="QR code opening your invoice checkout URL"
                        width={230}
                        height={230}
                      />
                      <Button asChild variant="outline">
                        <a href={qr} download="looppay-invoice.png">
                          Download QR code
                        </a>
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
          {view === "campaign-new" ? (
            <section className="panel">
              <h2>Choose your reward offer.</h2>
              <p className="small">
                Give a percentage of each eligible purchase back as rewards.
                Funding is a separate confirmed transaction. Reserve funds
                cannot be withdrawn in v1.
              </p>
              <form
                onSubmit={submit}
                onChange={() => {
                  setReviewed(false);
                  setReview(null);
                }}
              >
                <div className="grid-two">
                  <Field
                    name="percentage"
                    label="Reward percentage"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    defaultValue="5"
                    required
                  />
                  <Field
                    name="minimum"
                    label="Minimum purchase"
                    inputMode="decimal"
                    defaultValue="0"
                    required
                  />
                  <Field
                    name="cap"
                    label="Lifetime reward cap per customer"
                    inputMode="decimal"
                    required
                  />
                  <Field
                    name="budget"
                    label="Initial funding budget"
                    inputMode="decimal"
                    required
                  />
                  <Field
                    name="start"
                    label="Campaign start"
                    type="datetime-local"
                    required
                  />
                  <Field
                    name="end"
                    label="Campaign end"
                    type="datetime-local"
                    required
                  />
                </div>
                {review && !reviewed ? (
                  <div className="notice">
                    <h3>Review your campaign</h3>
                    <p>
                      You will give {Number(review.bps) / 100}% back to
                      customers. Your reserve starts at 0. Your planned funding
                      is {String(review.budget)} {network?.tokenSymbol}.
                    </p>
                    <p>
                      {String(review.start).replace("T", " ")} to{" "}
                      {String(review.end).replace("T", " ")} · Browser timezone.
                    </p>
                    <p>
                      After creation, approve and deposit the reserve below.
                      Reserve funds cannot be withdrawn in v1.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setReviewed(true);
                        setReview(null);
                      }}
                    >
                      I have reviewed these terms
                    </Button>
                  </div>
                ) : null}
                <Button disabled={!ready || tx.busy}>
                  {reviewed ? "Confirm campaign in wallet" : "Review campaign"}
                </Button>
              </form>
              {campaignId ? (
                <div className="notice success">
                  Campaign #{campaignId} confirmed. Fund it below; it earns
                  nothing until funded.
                </div>
              ) : null}
              <FundingForm
                onSubmit={fund}
                id={campaignId}
                amount={
                  created && network
                    ? formatUnits(BigInt(created), network.tokenDecimals)
                    : ""
                }
                disabled={!ready || tx.busy}
              />
            </section>
          ) : null}
          {view === "campaigns" ? (
            <>
              <div className="actions">
                <Button asChild>
                  <Link href="/merchant/campaigns/new">Create campaign ↗</Link>
                </Button>
              </div>
              <section className="panel">
                <h2>Your reward reserves</h2>
                {campaigns.isLoading ? (
                  <p>Loading campaigns…</p>
                ) : campaigns.error ? (
                  <div className="notice">
                    Indexer unavailable. You can fund an existing on-chain
                    campaign by ID below.
                  </div>
                ) : !campaigns.data?.campaigns.length ? (
                  <div className="empty">
                    No campaigns indexed yet. Create your first campaign to
                    start the Loop.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Campaign</th>
                          <th>Funded</th>
                          <th>Reserved / outstanding</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.data.campaigns.map((c) => (
                          <tr key={c.id}>
                            <td>
                              #{c.id} ·{" "}
                              {c.active ? "Earning enabled" : "Paused"}
                            </td>
                            <td>
                              {formatUnits(
                                BigInt(c.funded),
                                network!.tokenDecimals,
                              )}
                            </td>
                            <td>
                              {formatUnits(
                                BigInt(c.earned) - BigInt(c.redeemed),
                                network!.tokenDecimals,
                              )}
                            </td>
                            <td>
                              <Button
                                variant="outline"
                                disabled={!ready || tx.busy}
                                onClick={() =>
                                  tx.run(() =>
                                    sdk!.pauseCampaign(BigInt(c.id), c.active),
                                  )
                                }
                              >
                                {c.active ? "Pause earning" : "Resume earning"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <FundingForm onSubmit={fund} disabled={!ready || tx.busy} />
              </section>
            </>
          ) : null}
          {view === "partners" ? (
            <section className="panel">
              <h2>Welcome to the Loop Network.</h2>
              <p>
                Opt in to accept rewards issued by any LoopPay campaign. When a
                customer redeems here, the issuing merchant’s funded vault pays
                your current payout wallet.
              </p>
              <p className="small">
                Opting out prevents new redemptions at your shop. It does not
                remove rewards your customers have already earned. Tell
                customers which token you accept and verify each receipt before
                delivering goods.
              </p>
              <p>
                Status:{" "}
                <strong>
                  {partner.isLoading
                    ? "Loading…"
                    : partner.error
                      ? "Unavailable"
                      : partner.data
                        ? "Opted in"
                        : "Not participating"}
                </strong>
              </p>
              <Button
                disabled={
                  !ready || tx.busy || partner.isLoading || !!partner.error
                }
                onClick={() =>
                  tx.run(() =>
                    sdk!.optInToPartnerNetwork(
                      merchant.data!.id,
                      !partner.data,
                    ),
                  )
                }
              >
                {partner.data
                  ? "Leave partner network"
                  : "Join the Loop Network"}
              </Button>
            </section>
          ) : null}
        </>
      )}
      {error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : null}
      <TransactionState state={tx.state} />
    </div>
  );
}
function FundingForm({
  onSubmit,
  id = "",
  amount = "",
  disabled,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  id?: string;
  amount?: string;
  disabled: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="panel" key={id + amount}>
      <h3>Fund a campaign</h3>
      <p className="small">
        First submission approves the exact amount if needed. After
        confirmation, submit again to deposit it into the vault.
      </p>
      <div className="grid-two">
        <Field
          name="id"
          label="Campaign ID"
          inputMode="numeric"
          defaultValue={id}
          required
        />
        <Field
          name="amount"
          label="Funding amount (display token units)"
          inputMode="decimal"
          defaultValue={amount}
          required
        />
      </div>
      <Button disabled={disabled}>Approve or fund campaign</Button>
    </form>
  );
}
function Analytics({
  data,
  loading,
  error,
}: {
  data?: MerchantAnalytics;
  loading: boolean;
  error: boolean;
}) {
  const { network } = useLoopPay();
  if (loading) return <p role="status">Loading indexed analytics…</p>;
  if (error)
    return (
      <div className="notice">
        Analytics are unavailable until PostgreSQL and the event indexer are
        running.
      </div>
    );
  if (!data)
    return (
      <div className="empty">
        Connect your merchant wallet to view settlement and returning customer
        activity.
      </div>
    );
  const amount = (v: string) =>
    `${formatUnits(BigInt(v), network!.tokenDecimals)} ${network!.tokenSymbol}`;
  return (
    <section>
      {data.demo ? (
        <div className="notice">SYNTHETIC DEMO DATA — no real payments.</div>
      ) : null}
      <div className="metrics">
        {[
          ["Payment volume", amount(data.volume)],
          ["Payments", data.paymentCount],
          ["Unique customers", data.uniqueCustomers],
          ["Returning customers", data.repeatCustomers],
          ["Active campaigns", data.activeCampaigns],
          ["Campaign reserves", amount(data.fundsRemaining)],
          ["Rewards earned", amount(data.rewardsEarned)],
          ["Redemptions", data.redemptions],
          ["Redemption rate by value", `${data.redemptionRate}%`],
        ].map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="small">
        Indexed through block {data.indexedThrough}. Campaign reserves include
        outstanding earned liabilities. Analytics may lag confirmed
        transactions.
      </p>
    </section>
  );
}
function InvoiceHistory({ merchantId }: { merchantId: string }) {
  const { sdk, ready } = useLoopPay();
  const tx = useTransaction();
  const result = useQuery({
    queryKey: ["invoices", merchantId],
    queryFn: async () => {
      const r = await fetch(`/api/activity?merchant=${merchantId}`);
      if (!r.ok) throw new Error("Unavailable");
      return r.json() as Promise<{
        invoices: { id: string; amount: string; status: string }[];
      }>;
    },
    refetchInterval: 15000,
  });
  return (
    <section className="panel">
      <h2>Recent invoices</h2>
      {!result.data?.invoices.length ? (
        <p className="empty">
          {result.error
            ? "Invoice history needs the indexer connection."
            : "No invoices indexed yet. Your next sale starts with a new invoice."}
        </p>
      ) : (
        <ul className="history">
          {result.data.invoices.map((i) => (
            <li key={i.id}>
              <Link href={`/pay/${i.id}`}>Invoice #{i.id} ↗</Link> · {i.status}{" "}
              {i.status === "Open" ? (
                <Button
                  variant="outline"
                  disabled={!ready || tx.busy}
                  onClick={() => tx.run(() => sdk!.cancelInvoice(BigInt(i.id)))}
                >
                  Cancel
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <TransactionState state={tx.state} />
    </section>
  );
}
