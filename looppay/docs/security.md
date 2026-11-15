# Security assumptions and limitations

Only exact-transfer, non-rebasing ERC-20 tokens should be allowlisted. Rewards funding checks the received amount. Checkout relies on the token-manager review for direct settlement semantics. SafeERC20 supports standard optional-return tokens; fee-on-transfer and rebasing behavior is not supported. A token issuer may freeze or upgrade its own token independently of LoopPay.

Registry ownership is one immutable owner wallet per merchant; payout/metadata changes require that wallet. Ownership transfer, account recovery and delegate operators are not implemented. Admin roles control only token approval and protocol pause and can grant/revoke roles using OpenZeppelin AccessControl. One-time Checkout wiring cannot be replaced. No upgrade proxy, operator withdrawal, hidden protocol fee or admin sweep exists. Only the campaign merchant owner can refund unused budget after end/permanent closure. Operators should be multisigs before launch.

Customer payments go directly from customer to current merchant payout. An open invoice uses the latest payout address; wallet review is essential after merchant updates. Payment state is set before token calls, and reentrancy guards prevent re-entry. Reverting transfers revert payment and earning atomically. Campaign earning is authorized to the immutable checkout only; merchant/token linkage prevents attaching another issuer’s budget. All external economic mutations are bounded by actual funded budgets. Earn uses no external token calls.

Default self-payment protection excludes the owner and current payout wallet from earning. Merchants may explicitly disable it. Economic abuse remains possible through linked wallets, payout changes or collusion, and customers can split wallets to evade per-wallet lifetime caps. This spends issuer-funded incentives, not other campaigns’ budgets. LoopPay does not provide identity, sybil resistance, tax treatment, merchant fulfillment guarantees, customer cash redemption, chargebacks or purchase refunds. ERC-20 approvals persist if a payment fails; customers can revoke them with their wallet. The UI never asks for unlimited approval.

Redeeming transfers assets irreversibly to the selected merchant ID. There is no off-chain order authorization by the recipient, so customers must agree purchase terms with the shop before redemption. A campaign pause, expiry or issuer partner opt-out does not burn earned balances. The protocol emergency pause temporarily blocks redemption. Earned balances never expire. Owner-only refunds are bounded by budget - reserved after end/close. Checks-effects-interactions and a reentrancy guard protect transfers. Closing cannot reopen earning or cancel earned liabilities; pausing alone permits no refund. Refunds remain available under emergency pause.

Public metadata is validated and rendered as text; arbitrary logo URLs are stored but not fetched server-side, avoiding SSRF. QR encodes only an invoice URL. Fiat display labels are not exchange rates or on-chain payment amounts. Public APIs expose public chain activity only and cannot initiate writes. Add rate limiting and pagination/cursor UI for high-volume production usage; wallet activity is currently capped at documented query limits (100 payments/redemptions, 1000 earning rows), and the merchant analytics endpoint aggregates its full history. Private order references are hashed, but hashes of guessable references are not confidential.

Indexer is a single-writer service with confirmation lag and deep reorg detection. Configure one fresh database per deployment. Unexpected reorgs halt ingestion; manual canonical-journal replay is required; see [recovery](indexer-recovery.md). Database is not the source of truth for payment. A temporarily stale partner list can reject a redemption simulation; current contract checks decide eligibility. RPC trust and chain consensus remain dependencies.

The MVP has not received an independent security audit. Tests and coverage are evidence about tested behavior, not a proof of safety. No test or deploy command targets mainnet automatically. No wallet keys, seed phrases, account passphrases or hosted secrets belong in this repository, logs, browser environment, QR codes or support requests.

## Additional review boundaries

- Vault liabilities: every earned base unit remains reserved; refunds cannot reduce backing. Aggregate token balances must cover all campaign budgets. Tax/rebase/freeze/upgrade risk remains with allowlisting.
- Payout changes affect existing invoices at payment time. Recheck recipient before signing. Current-address checks cannot detect former or linked wallets.
- Approvals can remain after failure. Use exact amounts/known spenders; revoke residual allowance with wallet tooling.
- Identity is disabled. A future verifier must fail closed for rewards without propagating provider outages into purchase failure; no browser assertion can authorize earning.
- Public-address counts are not people. Explicit exclusions do not prove absence of collusion or truthful merchant labelling.
- Indexer/RPC data can lag; canonical checkpoint and replay protect projections, not consensus. Use one writer, least-privilege DB access, backups and lag alarms. Readiness redacts connection URLs/errors.
- Admin/token-manager/pauser keys remain powerful: unsafe token approval and interruption of redemption are possible. No admin can sweep budgets. Review multisig custody and incident communication.

See [independent review](security-review-checklist.md), [anti-abuse](anti-abuse.md), [wallet QA](wallet-qa.md) and [identity gate](qie-id-integration.md). No audit or static-analysis result is claimed.
