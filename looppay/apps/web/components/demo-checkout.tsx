"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
type Invoice = {
  id: string;
  amount: string;
  description: string;
  paid: boolean;
};
export function DemoCheckout({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<Invoice>();
  const [loaded, setLoaded] = useState(false);
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const records: Invoice[] = JSON.parse(
        localStorage.getItem("looppay-demo-invoices") || "[]",
      );
      setInvoice(
        id === "demo"
          ? {
              id,
              amount: "25.00",
              description: "Demo Corner Café · Lunch",
              paid: false,
            }
          : records.find((i) => i.id === id),
      );
    } catch {
      /* Missing demo storage or merchant metadata uses the visible fallback. */
    }
    setLoaded(true);
  }, [id]);
  function pay() {
    try {
      if (id !== "demo") {
        const records: Invoice[] = JSON.parse(
          localStorage.getItem("looppay-demo-invoices") || "[]",
        );
        localStorage.setItem(
          "looppay-demo-invoices",
          JSON.stringify(
            records.map((i) => (i.id === id ? { ...i, paid: true } : i)),
          ),
        );
      }
      setInvoice((i) => (i ? { ...i, paid: true } : i));
      setReview(false);
      setMessage("Demo payment complete. No real money was moved.");
    } catch {
      setMessage(
        "Could not save this demo payment. Enable browser storage and try again.",
      );
    }
  }
  return (
    <div className="checkout">
      <span className="eyebrow">DEMO CHECKOUT / NO REAL PAYMENTS</span>
      <h1>
        {invoice?.paid ? "Demo payment complete." : "Review your checkout."}
      </h1>
      {!loaded ? (
        <p role="status">Loading demo invoice…</p>
      ) : !invoice ? (
        <div className="empty">
          This demo invoice isn’t stored in this browser. Open it in the browser
          where it was created, or{" "}
          <Link className="text-link" href="/pay/demo">
            try the example checkout
          </Link>
          .
        </div>
      ) : (
        <section className="panel">
          <span className="pill">Demo data · QIE Testnet simulation</span>
          <h2>{invoice.description}</h2>
          <div className="checkout-amount">{invoice.amount}</div>
          <p>Demo credits · No monetary value</p>
          <p>
            Status:{" "}
            {invoice.paid ? "Paid (simulation)" : "Waiting for demo payment"}
          </p>
          <p>
            In a real checkout, stablecoins go directly to the shop’s payout
            wallet. Network gas fees apply.
          </p>
          {!invoice.paid ? (
            <>
              <p>
                Payments to shops are final and cannot be reversed. Check the
                shop, amount, and network before confirming.
              </p>
              {review ? (
                <div className="notice">
                  <h3>Confirm demo payment</h3>
                  <p>
                    {invoice.description}
                    <br />
                    {invoice.amount} demo credits
                    <br />
                    QIE Testnet simulation
                  </p>
                  <div className="actions">
                    <Button onClick={pay}>Confirm demo payment</Button>
                    <Button variant="outline" onClick={() => setReview(false)}>
                      Go back
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setReview(true)}>
                  Try demo payment
                </Button>
              )}
            </>
          ) : (
            <Link className="button" href="/wallet">
              Explore demo rewards
            </Link>
          )}
        </section>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
