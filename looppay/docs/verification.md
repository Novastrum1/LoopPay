# Verification evidence

Implementation session: 2026-11-14. All chain writes performed during this session used **local Anvil, chain 31337, unlocked ephemeral development accounts and TESTUSD mocks**. No private keys were requested, read, hardcoded, printed, or committed. QIE testnet/mainnet writes were not performed.

| Boundary             | Observed evidence                                                                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencies         | pnpm install completed; lockfile included as a source artifact                                                                                                                                                                |
| TypeScript / lint    | Workspace typecheck and ESLint passed                                                                                                                                                                                        |
| Unit tests           | 14 Vitest assertions across decimal handling, environment validation, forms and analytics passed                                                                                                                             |
| Solidity             | 29 Foundry tests passed, including 256-run fuzz tests for payments, expiry, cap and budget conservation, plus callback reentrancy attacks                                                                                    |
| Coverage             | Production contracts: 126/126 lines, 168/170 statements, 33/35 branches, 22/22 functions covered; deployment script excluded from these production figures                                                                   |
| Production frontend  | Next.js production build passed, including every requested route and read-only API                                                                                                                                           |
| Database             | Docker PostgreSQL 17 started; additive migration applied; repeat migrate reported no pending migrations                                                                                                                      |
| Deployment           | Registry, Rewards, Checkout and TESTUSD deployed on Anvil; one-time wiring and token approval completed                                                                                                                      |
| SDK                  | Local example created a merchant, funded 5% campaign and invoice                                                                                                                                                             |
| Economic integration | Local SDK test confirmed direct merchant transfer, zero Checkout balance, 5% earning, campaign pause, successful partner redemption with remaining credit intact                                                             |
| Indexer → API        | Confirmed local events produced API volume 20,000,000 base units, earned 1,000,000, one redemption of 500,000, remaining vault 99,500,000, redemption rate 50.00%; receipt API returned the matching public transaction hash |
| Browser safety flow  | Chromium navigated landing → merchant form, verified unconfigured payment disabled, wallet empty state and product docs                                                                                                      |
| Browser chain flow   | Injected local EIP-1193 test provider: merchant onboarding → QR invoice creation → second-account exact approval → payment → matching confirmed receipt; recipient token balance increased by the invoice amount             |
| Visual               | Desktop landing page inspected in Chromium; responsive styles implemented, separate mobile-device QA pending                                                                                                                 |

The browser chain invoice intentionally has no reward campaign and correctly reports zero earned credits; campaign earning and redemption are tested separately in the SDK and Foundry suites. The browser provider is a test harness forwarding to local unlocked Anvil accounts, not a claim that actual QIE Wallet devices were tested.

## Reproduce local integration

Follow README setup, start `pnpm contracts:anvil --block-time 1`, run `pnpm contracts:prepare:local`, deploy locally, run `pnpm exec tsx scripts/configure-local.ts`, then `pnpm demo:local`. Start `pnpm indexer:dev` and run:

```bash
pnpm test:integration
pnpm test:e2e
LOOPPAY_E2E_CHAIN=true pnpm test:e2e
```

The browser suites own isolated ports 3001/3002 and set their own app URL. Run them sequentially, because Next.js shares its build directory. The integration SDK assumes the local example's campaign 1 is funded and has remaining cap; it can be repeated until that campaign's cap/budget is consumed. Start a fresh local node and database for a clean campaign, without deleting production data. The indexer uses one database per deployment. The connected browser test reuses its merchant profile on repeated runs and asserts transfer deltas.

## Remaining external validation

QIE testnet deployment and source verification require operator-supplied RPC configuration and an encrypted test signer reference. Mainnet requires official stablecoin address/decimals confirmation and every manual release gate. The included verification adapter remains disabled until QIE confirms its Blockscout workflow and endpoint. Actual desktop/mobile QIE Wallet behavior, deployment source verification, independent security review, real-token issuer semantics and operational monitoring are pending. No mainnet release command is supplied before these prerequisites pass.

Dependency installation reports optional wallet-connector transitive deprecations and a React peer warning in an unused connector subtree. The web imports the injected connector from wagmi core rather than bundling that subtree. Run dependency review again before a production release.


## 2026-11-15 readiness revision

See [implementation report](implementation-report.md) for the current changes, complete file list, final test results and unresolved external release gates. The revised local suite passed frozen installation, migrations/generation, lint/types, 22 Vitest tests, 66 Foundry executions with fuzzing, coverage, stable ABI generation, production build, PostgreSQL projections, extended SDK close/refund redemption, and 8 Playwright tests without skips. A production API probe confirmed local canonical readiness with 12-block lag and withdrawal-aware indexed analytics. This is local evidence only; no QIE deployment, source verification, real-device certification, external audit or real traction is claimed.
