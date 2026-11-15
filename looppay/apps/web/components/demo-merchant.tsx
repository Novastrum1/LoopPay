"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MerchantNav } from "./shell";
import { Button } from "./ui/button";
import { Field } from "./field";
type Invoice = {
  id: string;
  amount: string;
  description: string;
  paid: boolean;
};
type Campaign = { rate: string; reserve: string; start: string; end: string };
export function DemoMerchant({ view }: { view: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [created, setCreated] = useState<Invoice>();
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [draft, setDraft] = useState<Campaign>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [opted, setOpted] = useState(false);
  useEffect(() => {
    try {
      setInvoices(
        JSON.parse(localStorage.getItem("looppay-demo-invoices") || "[]"),
      );
      setCampaigns(
        JSON.parse(localStorage.getItem("looppay-demo-campaigns") || "[]"),
      );
    } catch {
      /* Missing demo storage or merchant metadata uses the visible fallback. */
    }
    const refresh = () => {
      try {
        setInvoices(
          JSON.parse(localStorage.getItem("looppay-demo-invoices") || "[]"),
        );
      } catch {
        /* Missing demo storage or merchant metadata uses the visible fallback. */
      }
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  async function invoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const amount = String(f.get("amount"));
      if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0)
        throw Error(
          "Enter an amount greater than zero, with up to six decimal places.",
        );
      const item = {
        id: `demo-${crypto.randomUUID()}`,
        amount,
        description: String(f.get("description")),
        paid: false,
      };
      const next = [item, ...invoices];
      localStorage.setItem("looppay-demo-invoices", JSON.stringify(next));
      setInvoices(next);
      setCreated(item);
      const link = `${location.origin}/pay/${item.id}`;
      setUrl(link);
      const QR = await import("qrcode");
      setQr(await QR.toDataURL(link, { width: 460, margin: 2 }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create demo invoice. Enable browser storage and try again.",
      );
    }
  }
  function campaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const c = Object.fromEntries(f) as Campaign;
    setError("");
    if (new Date(c.end) <= new Date(c.start) || new Date(c.end) <= new Date()) {
      setError("Choose an end date after the start date and in the future.");
      return;
    }
    setDraft(c);
  }
  return (
    <div className="workspace">
      <MerchantNav />
      <span className="eyebrow">MERCHANT SPACE / DEMO DATA</span>
      <h1>
        {view === "invoice"
          ? "Create an invoice."
          : view === "campaign-new"
            ? "Set up a reward campaign."
            : view === "partners"
              ? "Welcome to the Loop Network."
              : "Your merchant space."}
      </h1>
      <p className="lead">
        Explore with a demo shop. All amounts, campaigns, and payments here are
        browser-local examples with no monetary value.
      </p>
      <div className="actions">
        <Link className="button" href="/merchant/invoices/new">
          Create invoice
        </Link>
        <Link className="button outline" href="/merchant/campaigns/new">
          Create campaign
        </Link>
      </div>
      {view === "invoice" ? (
        <section className="panel">
          <h2>A checkout you can share</h2>
          <form onSubmit={invoice}>
            <Field
              name="amount"
              label="Amount (demo credits)"
              inputMode="decimal"
              required
            />
            <Field
              name="description"
              label="Short description"
              maxLength={80}
              required
            />
            <Button>Create demo invoice</Button>
          </form>
          {created ? (
            <div className="notice success">
              <p>
                Demo invoice created ·{" "}
                {invoices.find((i) => i.id === created.id)?.paid
                  ? "Paid (simulation)"
                  : "Waiting for demo payment"}
              </p>
              <a className="link-break" href={url}>
                {url}
              </a>
              {qr ? (
                <img
                  className="qr"
                  src={qr}
                  width={230}
                  height={230}
                  alt="QR code opening the demo invoice"
                />
              ) : null}
              <p>
                This link works in this browser. Demo records are not shared
                between devices.
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setMessage("Demo link copied.");
                  } catch {
                    setMessage("Select and copy the link above.");
                  }
                }}
              >
                Copy payment link
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
      {view === "campaign-new" ? (
        <section className="panel">
          <h2>Choose your offer</h2>
          <p>
            Percentage rewards are supported in v1. This demo simulates creation
            and funding together.
          </p>
          <form onSubmit={campaign}>
            <div className="grid-two">
              <Field
                name="rate"
                label="Reward percentage"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                defaultValue="5"
                required
              />
              <Field
                name="reserve"
                label="Reserve funding (demo credits)"
                type="number"
                min="0.000001"
                step="0.000001"
                required
              />
              <Field
                name="start"
                label="Start date"
                type="datetime-local"
                required
              />
              <Field
                name="end"
                label="End date"
                type="datetime-local"
                required
              />
            </div>
            <Button>Review campaign</Button>
          </form>
          {draft ? (
            <div className="notice">
              <h3>Review your demo campaign</h3>
              <p>
                You will give {draft.rate}% back to customers. Your demo reserve
                will hold {draft.reserve} demo credits.
              </p>
              <p>
                {draft.start.replace("T", " ")} to {draft.end.replace("T", " ")}{" "}
                · Times use your browser’s timezone.
              </p>
              <p>
                Real reserve funding needs separate approval and deposit
                transactions. Live campaigns allow owner refunds of unreserved
                funds after end or permanent close; this demo does not simulate
                refunds.
              </p>
              <Button
                onClick={() => {
                  try {
                    const next = [draft, ...campaigns];
                    localStorage.setItem(
                      "looppay-demo-campaigns",
                      JSON.stringify(next),
                    );
                    setCampaigns(next);
                    setDraft(undefined);
                    setMessage("Demo campaign created. No funds were moved.");
                  } catch {
                    setError("Enable browser storage and try again.");
                  }
                }}
              >
                Confirm demo campaign
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
      {view === "partners" ? (
        <section className="panel">
          <h2>Accept rewards at your shop</h2>
          <p>
            When a customer spends rewards here, the issuing campaign’s reserve
            pays your shop. This control only changes the demo.
          </p>
          <Button onClick={() => setOpted(!opted)}>
            {opted ? "Leave demo network" : "Join demo network"}
          </Button>
          <p role="status">
            Demo participation: {opted ? "Opted in" : "Not opted in"}
          </p>
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
      <div className="grid-two">
        <section className="panel">
          <h2>Recent invoices · Demo data</h2>
          {invoices.length ? (
            <ul className="history">
              {invoices.map((i) => (
                <li key={i.id}>
                  <Link className="text-link" href={`/pay/${i.id}`}>
                    {i.description}
                  </Link>
                  <p>
                    {i.amount} demo credits ·{" "}
                    {i.paid ? "Paid (simulation)" : "Waiting"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">
              No demo invoices yet. Create one to try a QR checkout.
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Campaigns · Demo data</h2>
          {campaigns.length ? (
            <ul className="history">
              {campaigns.map((c, i) => (
                <li key={i}>
                  {c.rate}% back · {c.reserve} demo credits in simulated reserve
                  <p>
                    {c.start.replace("T", " ")} → {c.end.replace("T", " ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">
              No demo campaigns yet. Set up your first reward offer.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
