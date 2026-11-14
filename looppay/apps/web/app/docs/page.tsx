export default function Docs() {
  return (
    <article className="workspace prose">
      <span className="eyebrow">THE LOOPPAY FIELD GUIDE</span>
      <h1>Good business. Clear terms.</h1>
      <h2>Pay directly. Earn together.</h2>
      <p>
        Open a merchant’s invoice URL or scan its QR code. Connect a
        QIE-compatible wallet, check the configured network and stablecoin, then
        review the amount, expiry, payout wallet, and reward terms. Approve only
        the amount required. An approval is not a payment: return to submit the
        payment transaction.
      </p>
      <h2>Your receipt is on-chain.</h2>
      <p>
        We wait for two receipt confirmations before showing a successful
        transaction. Indexed history can take longer. Always verify the receipt
        and token transfer before delivering goods. The QR contains only a
        public invoice URL. Never enter a seed phrase or private key.
      </p>
      <h2>How rewards are backed</h2>
      <p>
        Merchants pre-fund campaign vaults with stablecoins. Each earned credit
        reserves that same amount of stablecoin. Campaign rates use basis
        points: 500 basis points means 5%. Minimum purchases, date windows,
        lifetime customer caps and available funding limit earning. The contract
        clips rewards to remaining budget rather than blocking a purchase.
      </p>
      <h2>A shared Loop Network</h2>
      <p>
        Reward balances cannot be transferred between customers or withdrawn for
        cash. Redeem with a merchant who has opted into the Loop Network. The
        issuing campaign’s vault pays the recipient’s current payout wallet.
        Check the merchant ID carefully: redemption is irreversible. Pausing or
        ending a campaign cannot take away credits already earned.
      </p>
      <h2>What merchants control</h2>
      <p>
        The connected wallet owns the profile and can update the payout wallet.
        Payout changes apply to open invoices, so review the latest address
        before paying. Merchants may pause future earning or opt out of
        accepting rewards. There is no withdrawal of campaign funds in v1, even
        after a campaign ends: only redemption spends the reserve.
      </p>
      <h2>Know the limits</h2>
      <p>
        LoopPay v1 charges no protocol fee. Network gas is separate. Operators
        can approve tokens and pause transactions, but cannot move payment or
        campaign funds. Only exact-transfer, non-rebasing ERC-20 tokens should
        be approved. Token issuer freezing, wallet compromise, chain
        reorganizations, malicious merchant self-purchases and merchant delivery
        disputes remain risks. No refunds, exchange rate guarantee, cash
        redemption, or independent security audit is provided by this MVP.
      </p>
      <h2>Development and demo data</h2>
      <p>
        Local Anvil and QIE testnet activity has no monetary value. Synthetic
        demo data is disabled by default and clearly labeled when enabled.
        Deployment addresses, token identity, explorer and RPC are supplied by
        the operator from official QIE documentation. Never send real funds to a
        test invoice.
      </p>
    </article>
  );
}
