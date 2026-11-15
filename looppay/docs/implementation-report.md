# LoopPay testnet-readiness implementation report

Date: 2026-11-15. Scope: existing monorepo, preserving direct merchant settlement, warm web UI, typed SDK and confirmed event indexing. No QIE deployment, source verification, real funds, live identity integration or independent audit is claimed. The local rehearsal uses chain 31337 and TESTUSD only.

## Implemented

1. Repaired frozen installation: integrity-pinned upstream forge-std archive, established PostCSS override, exact version pins, aligned devcontainers/CI and dependency policy. Verified vendored archive against upstream SHA-256.
2. Added permanent campaign close and owner-only unused-budget refund after end/close. Withdrawal cannot exceed budget - reserved; pause alone permits no refund. Earned credits remain redeemable and never expire. Added SDK methods, ABI, live merchant controls and projections.
3. Added default merchant-owner/current-payout reward exclusion, atomic Open/Verified/Disabled policy, immutable test invoices, payment classification and separated bigint analytics. Linked wallets and collusion remain unresolved limitations.
4. Added IdentityProvider abstraction and disabled implementation; identity-required earning fails closed on-chain. No undocumented QIE API or credential contract was invented.
5. Added separate placeholder environments and read-only config/smoke scripts, bytecode/metadata checks, chain/explorer checks, explicit mock gates and source/approval gates. No mainnet deployment command exists.
6. Added wallet provider/network/capability guidance, checkout eligibility, campaign close/refund review, non-transferability labels and real-device QA checklist.
7. Added web liveness/readiness, lag/canonicality reporting, operator-controlled canonical-journal replay, additive migrations, database projection verification and expanded threat model/reviewer guidance.
8. Added testnet runbook, demo script, release-evidence template, consented pilot plan and changelog.
9. Strengthened CI: cancellation, read-only GitHub permissions, summary, failure artifacts, local Anvil SDK/browser integration and native Foundry failure propagation. Foundry's npm 1.7.1 launcher lost child exit codes; repository commands now invoke the same pinned native binary and a regression test checks failures remain failures.

## Observed verification

| Check | Result |
| --- | --- |
| pnpm install --frozen-lockfile | Passed after intentional lockfile regeneration |
| Prisma generation and additive migrations | Passed, including a fresh isolated local database |
| pnpm lint | Passed |
| pnpm typecheck | Passed, including readiness script, SDK examples/tests and all workspace apps |
| pnpm test | 22 tests passed |
| pnpm test:indexer | PostgreSQL lifecycle/refund/earning/redemption/classification/test projections passed; fixtures rolled back |
| pnpm test:contracts | 66 executions passed, zero failed/skipped; includes inherited regression tests and 256-run fuzz cases |
| pnpm contracts:coverage | Passed; Checkout/Registry 100% line coverage; Rewards 99.12% lines, 86.67% branches |
| ABI regeneration | Byte-for-byte stable against saved generated ABI |
| pnpm build | Passed, including health/readiness routes |
| pnpm test:integration | Passed on Anvil: settlement, earning, pause, partner redemption, close, unreserved refund, post-close redemption |
| Browser suites | 2 live Anvil + 6 demo/accessibility/health tests passed sequentially, zero skipped |
| Production API probe | Health 200; readiness 200, chain 31337, canonical checkpoint, lag 12; real indexed withdrawal-aware analytics (not synthetic) |
| pnpm qie:smoke-test | Correctly refused readiness for unset official inputs; redacted report, nonzero exit |
| git diff --check | Passed |

Initial browser launch failed because system libraries were absent; installed Playwright's required Chromium dependencies. A subsequent concurrent build/browser run caused a renderer crash; final browser verification runs sequentially after the build. Those failures were not suppressed or converted into success. Development warnings include Next's custom ESLint-config notice and dev-origin notice; dependency peer/deprecation warnings remain documented review items.

## Release gates and human-controlled steps

- Confirm official stablecoin address, symbol, decimals and transfer/issuer behavior. Mainnet token values stay unset.
- Obtain a usable official QIE ID verification protocol/API/ABI and review an on-chain authorization path before enabling identity rewards.
- Confirm source-verification workflow. The official hackathon quickstart directs explorer verification; automated Blockscout compatibility remains unconfirmed.
- Perform and record real QIE Wallet desktop/mobile and injected-wallet QA. Automated injection is not QIE Wallet certification.
- Complete independent security review and reproducibly pinned static analysis; Slither was documented but not installed/run. Canonical replay is implemented and documented; destructive reorg rehearsal remains an operator exercise against a backup.
- Push reviewed code and observe the exact commit's GitHub Actions result. Current GitHub status API showed Vercel success only; no remote Actions success for these uncommitted changes is claimed. Require verify in branch protection.

Only the human runs testnet signing: configure the ignored environment and encrypted Foundry account name, run qie:validate-config --pre-deploy, then contracts:deploy:testnet and the locally operated keystore prompt. Record addresses/first block, verify sources using the confirmed workflow, run full qie:validate-config and qie:smoke-test, then execute the complete [testnet runbook](testnet-runbook.md). The optional contracts:verify:testnet adapter is gated on official workflow confirmation. Never send passwords, wallet secrets or production connection strings to the agent.

No mainnet deployment, production approval, real-fund transfer, fabricated user metric or public compatibility claim was made. Local Anvil broadcast/compiler caches and environment files are ignored; the pre-existing root reference image was left untouched. Existing local database data was preserved; the rehearsal selected a separate local database.

## Files changed

Paths below include prior pending dependency/environment changes retained and completed by this task. Generated SDK ABI is intentionally tracked; local broadcasts, caches, secrets and test artifacts are excluded.

- `.devcontainer/devcontainer.json`
- `.github/workflows/ci.yml`
- `looppay/.devcontainer/devcontainer.json`
- `looppay/.env.example`
- `looppay/.github/workflows/ci.yml`
- `looppay/.gitignore`
- `looppay/.node-version`
- `looppay/CHANGELOG.md`
- `looppay/README.md`
- `looppay/apps/indexer/package.json`
- `looppay/apps/indexer/prisma/migrations/202611150001_campaign_lifecycle/migration.sql`
- `looppay/apps/indexer/prisma/schema.prisma`
- `looppay/apps/indexer/src/analytics.test.ts`
- `looppay/apps/indexer/src/analytics.ts`
- `looppay/apps/indexer/src/index.ts`
- `looppay/apps/indexer/src/project.ts`
- `looppay/apps/indexer/src/projection.integration.ts`
- `looppay/apps/indexer/src/replay.ts`
- `looppay/apps/indexer/src/start.ts`
- `looppay/apps/web/app/api/health/route.ts`
- `looppay/apps/web/app/api/readiness/route.ts`
- `looppay/apps/web/app/docs/page.tsx`
- `looppay/apps/web/components/campaign-refund.tsx`
- `looppay/apps/web/components/checkout.tsx`
- `looppay/apps/web/components/customer-wallet.tsx`
- `looppay/apps/web/components/demo-merchant.tsx`
- `looppay/apps/web/components/merchant.tsx`
- `looppay/apps/web/components/wallet-capabilities.tsx`
- `looppay/apps/web/package.json`
- `looppay/apps/web/playwright.config.ts`
- `looppay/apps/web/tests/chain.spec.ts`
- `looppay/apps/web/tests/flow.spec.ts`
- `looppay/config/qie.mainnet.example.env`
- `looppay/config/qie.testnet.example.env`
- `looppay/docs/UI-VERIFICATION.md`
- `looppay/docs/anti-abuse.md`
- `looppay/docs/architecture.md`
- `looppay/docs/demo-script.md`
- `looppay/docs/dependency-policy.md`
- `looppay/docs/implementation-report.md`
- `looppay/docs/indexer-recovery.md`
- `looppay/docs/mainnet-checklist.md`
- `looppay/docs/merchant-pilot-plan.md`
- `looppay/docs/qie-id-integration.md`
- `looppay/docs/release-evidence-template.md`
- `looppay/docs/security-review-checklist.md`
- `looppay/docs/security.md`
- `looppay/docs/testnet-runbook.md`
- `looppay/docs/verification.md`
- `looppay/docs/wallet-qa.md`
- `looppay/eslint.config.mjs`
- `looppay/package.json`
- `looppay/packages/config/package.json`
- `looppay/packages/contracts/package.json`
- `looppay/packages/contracts/src/LoopPayCheckout.sol`
- `looppay/packages/contracts/src/LoopPayRewards.sol`
- `looppay/packages/contracts/src/interfaces/ILoopPayRewards.sol`
- `looppay/packages/contracts/test/Reentrancy.t.sol`
- `looppay/packages/contracts/test/VaultLifecycle.t.sol`
- `looppay/packages/contracts/vendor/forge-std-1.9.6.tgz`
- `looppay/packages/sdk/examples/integration.ts`
- `looppay/packages/sdk/package.json`
- `looppay/packages/sdk/src/abi.ts`
- `looppay/packages/sdk/src/identity.ts`
- `looppay/packages/sdk/src/index.ts`
- `looppay/packages/sdk/tests/foundry-runner.test.ts`
- `looppay/packages/sdk/tests/identity.test.ts`
- `looppay/packages/sdk/tests/qie-readiness.test.ts`
- `looppay/pnpm-lock.yaml`
- `looppay/scripts/db.mjs`
- `looppay/scripts/deploy.mjs`
- `looppay/scripts/foundry.mjs`
- `looppay/scripts/qie-readiness.ts`
- `looppay/scripts/setup.sh`
- `looppay/scripts/tsconfig.json`
- `looppay/scripts/verify.mjs`
