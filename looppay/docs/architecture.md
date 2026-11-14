# Architecture and economic model

```mermaid
flowchart LR
  W[Next.js + wagmi wallet] --> SDK[Typed viem SDK]
  SDK --> R[Registry: owners, payout, token allowlist, pause]
  SDK --> C[Checkout: invoices]
  C -->|transferFrom customer directly to payout| T[Approved stablecoin]
  C -->|earn once per invoice| L[Rewards: campaign vault + balances]
  L -->|reserve liability| B[Non-transferable customer credit]
  R & C & L -->|events via confirmed RPC polling| I[Indexer]
  I --> P[(Postgres + Prisma projections)]
  P --> A[Read-only analytics APIs]
  A --> W
```

## Payment

```mermaid
sequenceDiagram
 participant M as Merchant
 participant W as Customer wallet
 participant C as Checkout
 participant T as Stablecoin
 participant L as Rewards
 M->>C: createInvoice(owner checked, approved token)
 M-->>W: Public invoice URL / QR
 W->>C: Read amount, expiry, current payout, campaign
 W->>T: approve(Checkout, exact amount) if necessary
 W->>C: payInvoice(id)
 C->>C: Validate open, token, expiry, pause; mark Paid
 C->>T: transferFrom(customer, merchant current payout, amount)
 C->>L: earn(invoice, campaign, customer, amount)
 L->>L: Reserve min(rate, customer cap, available budget)
 C-->>W: InvoicePaid log
 W->>W: Wait two confirmations; inspect matching receipt log
```

## Cross-merchant redemption

```mermaid
sequenceDiagram
 participant A as Issuer merchant A
 participant B as Partner merchant B
 participant W as Customer wallet
 participant L as Rewards vault
 participant R as Registry
 A->>L: Deposit campaign stablecoins
 L->>L: Earned balances reserve equal stablecoin liability
 B->>L: Opt into shared Loop Network
 W->>L: redeem(campaign A, merchant B, amount, unique ID)
 L->>L: Check B opted in, balance, unique customer redemption ID
 L->>L: Reduce balance, reserved and budget before external transfer
 L->>R: Read B payout wallet
 L->>B: Transfer A vault stablecoins to B payout
 L-->>W: RewardRedeemed
```

Each campaign uses one approved payment token. Its rewards use exactly that token’s base units; there is no floating point conversion or oracle. Multiple tokens are never summed by the intended single-token web deployment. Reward calculation uses OpenZeppelin `Math.mulDiv` to avoid multiplication overflow.

For each campaign, `0 <= reserved <= budget`. `budget` is funded assets minus redemptions; `reserved` is cumulative earned minus redeemed. Available new earning is `budget - reserved`. Customer lifetime cap is cumulative earned and does not reset on redemption. Merchant B accepts the issuer’s token when opting into the shared network. Cross-token conversion is unsupported. B opts in independently; A need not remain a recipient partner for its issued credits to redeem elsewhere.

Earning is clipped to available funding and remaining cap; an exhausted/paused/out-of-window campaign does not block checkout. Campaigns are linked to the invoice merchant and token. Invoice IDs can earn once; redemptions have customer-scoped unique IDs. Campaign pause and end affect earning only. Protocol emergency pause suspends transactional flows, including redemption, until an authorized pauser resumes.

No withdrawal function exists. Unallocated budget is locked as well as earned liabilities in v1; merchants must understand this before funding. No expiry of earned credits. This simple conservative policy avoids a merchant withdrawing another customer’s reserve. A future release could permit withdrawal of unreserved assets after review, but must never reduce backing of earned balances. No admin custody, hidden fee, reward transfer, or protocol fee exists. Future fee logic would require a separately reviewed version and explicit UX disclosure.

## Indexing and analytics

Polling works with a standard HTTP RPC, no paid indexer or websocket required. Index 500-block ranges from the first deployment block to `head - confirmations` (default 12). Sort/order follows RPC log order; logs are processed in order inside one DB transaction. Each raw event key is `chainId:txHash:logIndex`; a transaction writes raw events, projections and checkpoint atomically. A retry sees either all or none. A checkpoint includes the deployment-specific address tuple and canonical block hash.

Transient RPC/DB errors retry after five seconds, with viem transport retry inside each request. A checkpoint hash mismatch halts the process with an operator error; it never silently publishes a corrupted projection. Restore into a fresh database by replaying from deployment block, validate, then repoint the web/indexer. Run a single indexer instance per database. Deep reorg recovery is deliberately manual. Monitor checkpoint lag and process exit status.

Analytics use bigint token units: volume, payment count, unique/returning payer addresses, date-active campaigns, vault funds remaining, rewards earned, redemption count, and value-based redemption percentage. Wallet count is not person count. Projections and APIs are public read-only data, not payment authorization. Wallet balances and receipt status are checked on-chain. Metadata is JSON in the registry, validated before rendering and never interpreted as HTML. QR data contains only a public URL.
