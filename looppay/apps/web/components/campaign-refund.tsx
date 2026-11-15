"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, getAddress } from "viem";
import { rewardsAbi, tokenAmount } from "@looppay/sdk";
import { useLoopPay, useTransaction } from "../lib/use-looppay";
import { Button } from "./ui/button";
import { TransactionState } from "./transaction";
export function CampaignRefund() {
  const { sdk, network, ready, account } = useLoopPay();
  const tx = useTransaction();
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const valid = /^[1-9]\d*$/.test(id);
  const campaign = useQuery({
    queryKey: ["refund-campaign", id, network?.rewards],
    enabled: !!sdk && valid,
    queryFn: async () => {
      const [record, state] = await Promise.all([
        sdk!.getCampaign(BigInt(id)),
        sdk!.publicClient.readContract({
          address: network!.rewards,
          abi: rewardsAbi,
          functionName: "campaignState",
          args: [BigInt(id)],
        }),
      ]);
      const merchant = await sdk!.getMerchant(record[0]);
      return { record, state, owner: merchant[0] };
    },
    refetchInterval: 10000,
  });
  const data = campaign.data;
  const owner =
    !!data && data.owner.toLowerCase() === account.address?.toLowerCase();
  return (
    <section className="panel" aria-label="Campaign refunds">
      <h3>Close campaign and refund unused funds</h3>
      <p>
        Closing permanently stops new rewards. Earned, non-transferable credits
        remain reserved and redeemable at participating partners. Pausing alone
        does not allow a refund.
      </p>
      <label className="field">
        Campaign ID
        <input
          inputMode="numeric"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setConfirmClose(false);
          }}
        />
      </label>
      {campaign.error ? (
        <p role="alert">Campaign unavailable. Check the ID and connection.</p>
      ) : null}
      {data && network ? (
        <>
          <p>
            Status:{" "}
            {["Draft", "Active", "Paused", "Ended", "Closed"][data.state]} ·
            Unreserved:{" "}
            {formatUnits(
              data.record[5] - data.record[6],
              network.tokenDecimals,
            )}{" "}
            {network.tokenSymbol} · Reserved:{" "}
            {formatUnits(data.record[6], network.tokenDecimals)}
          </p>
          {!owner ? (
            <p>Connect the campaign owner wallet to manage this reserve.</p>
          ) : null}
          {data.state < 3 ? (
            <>
              <label className="field">
                <span>
                  <input
                    type="checkbox"
                    checked={confirmClose}
                    onChange={(e) => setConfirmClose(e.target.checked)}
                  />{" "}
                  I understand closure is permanent.
                </span>
              </label>
              <Button
                disabled={!ready || tx.busy || !owner || !confirmClose}
                onClick={() =>
                  tx.run(
                    () => sdk!.closeCampaign(BigInt(id)),
                    () => {
                      void campaign.refetch();
                      setConfirmClose(false);
                    },
                  )
                }
              >
                Permanently close campaign
              </Button>
            </>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                const values = new FormData(e.currentTarget);
                try {
                  const amount = tokenAmount(
                    String(values.get("amount")),
                    network.tokenDecimals,
                  );
                  if (amount > data.record[5] - data.record[6])
                    throw Error("Amount exceeds unreserved funds.");
                  const recipient = getAddress(String(values.get("recipient")));
                  await tx.run(
                    () =>
                      sdk!.withdrawUnreservedFunds(
                        BigInt(id),
                        amount,
                        recipient,
                      ),
                    () => {
                      void campaign.refetch();
                    },
                  );
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Check refund values.",
                  );
                }
              }}
            >
              <label className="field">
                Refund amount ({network.tokenSymbol})
                <input name="amount" inputMode="decimal" required />
              </label>
              <label className="field">
                Recipient wallet
                <input
                  name="recipient"
                  required
                  defaultValue={account.address}
                />
              </label>
              <p>
                Review the amount and recipient in your wallet before confirming
                the transfer.
              </p>
              <Button disabled={!ready || tx.busy || !owner}>
                Review and withdraw in wallet
              </Button>
            </form>
          )}
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <TransactionState state={tx.state} />
    </section>
  );
}
