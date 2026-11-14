# LoopPay

**Good business comes around.** Stablecoin checkout and a fully reserved, interoperable loyalty network for independent merchants on QIE.

Customers scan an invoice URL, review the merchant and token, approve only when necessary, and pay directly into the merchant’s wallet. Merchants fund loyalty campaigns. Customers earn non-transferable token-denominated credits and spend them with opted-in Loop Network neighbors. The issuing campaign pays the redeeming shop. There is no protocol fee in v1.

This is original application and contract code, not a fork of a payment project. **Release status: development MVP; no QIE deployment, source verification, audit, or mainnet launch is claimed.** Read [verification](docs/verification.md) for observed checks and limits.

## Architecture

| Component            | Responsibility                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/contracts` | Solidity 0.8.24 registry, direct checkout, reserved loyalty vault; OpenZeppelin 5.2, Foundry tests  |
| `packages/sdk`       | Typed generated ABIs, exact decimal conversion, chain-checked simulated writes, confirmed receipts  |
| `packages/config`    | Validated environment-driven networks, contract addresses, explorer helper                          |
| `apps/indexer`       | viem RPC polling, atomic PostgreSQL projections and checkpoint, Prisma migrations, bigint analytics |
| `apps/web`           | Next.js 15 App Router, React, wagmi/viem, Tailwind, shadcn-style Radix button, Lucide, QR invoices  |

See [architecture and economic model](docs/architecture.md), [security](docs/security.md), and [manual release gates](docs/mainnet-checklist.md). Customer payments never enter a LoopPay balance. Merchant campaign funds are intentionally held in isolated accounting vaults in Rewards. Operators have no withdrawal function.

## Exact Codespaces setup

Open this repository in Codespaces and select `looppay/.devcontainer/devcontainer.json` (the root devcontainer forwards to this configuration). Ports 5432 and 8545 must stay private. The setup script installs pinned pnpm dependencies, including npm-distributed Foundry binaries, generates Prisma, starts local PostgreSQL, and runs additive migrations. No database reset is used.

```bash
cd /workspaces/LoopPay/looppay
bash scripts/setup.sh
# Terminal 1. --silent prevents Anvil printing development keys.
pnpm contracts:anvil --block-time 1
```

In terminal 2:

```bash
cd /workspaces/LoopPay/looppay
# Obtain an unlocked LOCAL public account address; no key is read or printed.
pnpm exec cast rpc eth_accounts --rpc-url http://127.0.0.1:8545
```

Alternatively run `pnpm contracts:prepare:local` to populate the local public account automatically. Copy one **public address** into `DEPLOYER_ADDRESS` in `.env`, leaving `STABLECOIN_ADDRESS` blank to deploy a clearly marked mock. Then:

```bash
pnpm test:contracts
pnpm contracts:deploy:local
pnpm abi
```

Read `packages/contracts/broadcast/Deploy.s.sol/31337/run-latest.json` locally. Populate `NEXT_PUBLIC_REGISTRY_ADDRESS`, `NEXT_PUBLIC_CHECKOUT_ADDRESS`, `NEXT_PUBLIC_REWARDS_ADDRESS`, and `NEXT_PUBLIC_STABLECOIN_ADDRESS` from its creation transactions; set `DEPLOYMENT_BLOCK` to the first creation block. Broadcast artifacts are ignored. Alternatively use the non-secret local helper:

```bash
pnpm exec tsx scripts/configure-local.ts
pnpm demo:local
# Terminal 2
pnpm indexer:dev
# Terminal 3 (Next reads apps/web/.env.local symlink created by setup)
pnpm dev
```

Open port 3000. `demo:local` creates a merchant, funded campaign and invoice using Anvil’s unlocked JSON-RPC accounts. It refuses any other chain and verifies the token’s mock name. It requires block production for the SDK’s two confirmations. Browser wallet payment requires a local development wallet configured for Anvil; do not import or reuse a real funded wallet. A browser outside Codespaces needs a private authenticated forwarded RPC URL; set `NEXT_PUBLIC_RPC_URL` to that browser-reachable URL, or use local port forwarding over SSH. The indexer can keep `QIE_RPC_URL=http://127.0.0.1:8545` internally. Never publicly expose Anvil unlocked accounts.

For production builds, use an absolute `.env.local` copy or the setup symlink. Public variables are embedded at build time: restart/rebuild after changing networks. One database is supported per deployment/network; use a new database for a new deployment.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contracts
pnpm exec forge coverage --root packages/contracts --report summary
pnpm build
pnpm --filter @looppay/web exec playwright install --with-deps chromium
pnpm test:e2e
# After local deployment, demo:local, and starting indexer:
pnpm test:integration
LOOPPAY_E2E_CHAIN=true pnpm test:e2e
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm indexer:dev
pnpm contracts:anvil --block-time 1
pnpm contracts:deploy:local
pnpm contracts:deploy:testnet
pnpm contracts:verify:testnet
```

The Foundry binaries are available through `pnpm exec`; global Foundry installation is unnecessary. CI runs lint, typechecks, migrations, contract tests/coverage, ABI consistency, TypeScript tests, frontend build and a Playwright navigation/safety flow. No CI step deploys anything.

## QIE configuration — official sources only

Confirmed against the [official network documentation](https://docs.qie.digital/getting-started-with-qie-blockchain/4.-access-mainnet-or-testnet) during implementation (2026-11-14):

| Value                                 | Official documentation                                           | Configuration                                               |
| ------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Testnet chain ID                      | `1983`                                                           | `NEXT_PUBLIC_CHAIN_ID=1983`                                 |
| Testnet RPC                           | `https://rpc1testnet.qie.digital/` (recommended in docs)         | `QIE_TESTNET_RPC_URL`, `QIE_RPC_URL`, `NEXT_PUBLIC_RPC_URL` |
| Testnet explorer                      | `https://testnet.qie.digital/`                                   | `NEXT_PUBLIC_EXPLORER_URL`                                  |
| Mainnet chain ID                      | `1990`                                                           | `QIE_MAINNET_CHAIN_ID`, only after release review           |
| Mainnet RPC                           | `https://rpc1mainnet.qie.digital/`                               | `QIE_MAINNET_RPC_URL`, not used by development scripts      |
| Mainnet explorer                      | `https://mainnet.qie.digital/`                                   | set public explorer only during reviewed release            |
| Mainnet stablecoin address / decimals | **Not confirmed from official docs; intentionally unset**        | `QIE_MAINNET_STABLECOIN_ADDRESS`                            |
| Verification API workflow             | **Not confirmed in official docs; blocked pending confirmation** | verifier variables                                          |

The [official QUSDC documentation](https://docs.stable.qie.digital/) describes a USDC-backed token, but that description is not evidence of a specific approved contract address. Do not substitute native QIE, WQIE, USDC on another chain, a search-result address, or a mock for QIE Stable Coin on mainnet. Confirm the exact contract, code, decimals, symbol, issuer behavior, and canonical network with QIE before approval.

The [QIE developer page](https://www.qie.digital/blockchain-for-developers) says QIE Wallet and EVM-compatible wallets can use its network configuration. This MVP uses wagmi’s injected EVM connector and EIP-6963 provider discovery. Desktop QIE Wallet provider behavior and mobile deep linking must be validated with actual devices; no unsupported native-wallet SDK integration is claimed.

## Safe testnet deployment and verification

1. Finish local checks, local payment, reward earning, redemption, and pause rehearsals. Use a separate test-only wallet. Store signing material in an encrypted Foundry keystore outside this repository; `.env` contains only its account **name**, never a private key or passphrase.
2. Obtain **testnet gas only** from the [official QIE faucet](https://www.qie.digital/faucet). Never pay for test tokens or send real funds. The faucet is not assumed to issue stablecoins. With `STABLECOIN_ADDRESS` blank, the testnet deployment creates `TEST ONLY Loop Dollar`; clearly label it `TESTUSD`. If QIE provides an official test stablecoin, confirm it with QIE and set its address instead.
3. Fill `QIE_TESTNET_RPC_URL` from current official docs, `DEPLOYER_ADDRESS`, and `DEPLOYER_ACCOUNT`. Check `pnpm exec cast chain-id --rpc-url "$QIE_TESTNET_RPC_URL"` in a shell that has loaded your non-secret variables: it must return **1983**. The deployment wrapper checks again and runs local contract tests before broadcast.
4. Run `pnpm contracts:deploy:testnet`. Approve the encrypted-keystore prompt locally. The Solidity script refuses all chain IDs except 31337 and 1983. It creates Registry → Rewards → Checkout, wires Checkout once, and approves the test token.
5. Validate all deployed bytecode, constructor arguments, immutable references, role holders, token details and first block against receipts. Record addresses below and populate the public configuration. Start the indexer with a fresh PostgreSQL database and the recorded deployment block; confirmations default to 12.
6. **Verification is gated.** Obtain the current verification workflow from official QIE docs/support. The included adapter supports Blockscout only if QIE confirms compatibility; do not guess an API endpoint. Set `QIE_VERIFICATION_WORKFLOW_CONFIRMED=true`, `QIE_TESTNET_VERIFIER_URL`, `VERIFY_CONTRACT_ADDRESS`, `VERIFY_CONTRACT_NAME` (e.g. `src/LoopPayRegistry.sol:LoopPayRegistry`) and ABI-encoded `VERIFY_CONSTRUCTOR_ARGS`. Run `pnpm contracts:verify:testnet` for each contract and check the explorer’s verified source matches Solidity 0.8.24, Paris EVM, optimizer 200 and this exact source. If the official workflow differs, adapt the verifier before proceeding.
7. Run a test checkout with a second wallet, confirm direct settlement, earn a capped reward, redeem at a second opted-in merchant, pause earning, and prove existing rewards still redeem. Verify wallet rejection, wrong chain, insufficient balance and expired invoices. Record receipts and device/browser results.

| Contract            | Local                | QIE testnet                      | QIE mainnet                    |
| ------------------- | -------------------- | -------------------------------- | ------------------------------ |
| Registry            | Fill from deployment | Pending                          | Not deployed                   |
| Checkout            | Fill from deployment | Pending                          | Not deployed                   |
| Rewards             | Fill from deployment | Pending                          | Not deployed                   |
| Approved stablecoin | TESTUSD mock         | Mock or QIE-confirmed test token | Requires official confirmation |

## Mainnet release

**Mainnet deployment has not been performed.** There is no mainnet deployment script or default command. [Mainnet checklist](docs/mainnet-checklist.md) requires testnet deployment, verified source, contract review and manual release approval first. Only after those gates pass should a reviewer prepare the explicit mainnet command and a separately reviewed mainnet deployment script; the development script cannot target mainnet. No production funds are needed for this build.

## Judge demonstration (5 minutes)

1. Show the warm retail landing page and create a merchant profile using a test wallet.
2. Create a 500-bps campaign, approve and fund 100 test stablecoins, then join the Loop Network.
3. Create a 24-token invoice with a 1-hour expiry; download its QR. Open its URL in a customer wallet.
4. Show exact-amount approval, separate payment, pending confirmations, receipt and 1.2-token reward (assuming no cap/budget reduction).
5. Have a second merchant opt in. Redeem 1 token there; inspect the direct vault-to-partner transfer.
6. Pause the issuing campaign; prove the remaining 0.2 credits are intact. Show returning-customer analytics and indexer checkpoint lag.
7. Open the security docs and distinguish local/testnet receipts from the future mainnet release.

`DEMO_MODE=true` generates labeled synthetic analytics only on chain 31337; default false. It never creates chain transactions or fake confirmed receipts. No demo data is silently used when RPC/database requests fail.

## 90-day traction plan

Track consented merchant activations (profile + funded campaign + first settled invoice), weekly active merchants, actual stablecoin payment count/volume by token, unique and repeat public payer addresses, 7/30-day returning-payer cohorts, funded/reserved/redeemed rewards, cross-merchant redemptions, and median invoice-to-confirmation time. A wallet is not a unique human; label this limitation. Exclude team wallets, self-payments, mock tokens and synthetic data. Publish weekly aggregates with deployment and block range. Days 1–30: validate checkout with a small merchant cohort; 31–60: measure repeat use and partner redemption; 61–90: assess retention and funded reward sustainability. No invented traction or commitments.

MIT licensed. Public addresses and on-chain activity only; no wallet secrets, customer names, order contents or private wallet data are collected.
