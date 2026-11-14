# Source file tree

```text
looppay/
├── .devcontainer/
│   └── devcontainer.json
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   ├── indexer/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   │   ├── 202611140001_initial/
│   │   │   │   │   └── migration.sql
│   │   │   │   └── migration_lock.toml
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── analytics.test.ts
│   │   │   ├── analytics.ts
│   │   │   ├── index.ts
│   │   │   └── project.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   ├── activity/
│       │   │   │   └── route.ts
│       │   │   ├── analytics/
│       │   │   │   └── [merchantId]/
│       │   │   │       └── route.ts
│       │   │   └── receipt/
│       │   │       └── [invoiceId]/
│       │   │           └── route.ts
│       │   ├── docs/
│       │   │   └── page.tsx
│       │   ├── merchant/
│       │   │   ├── analytics/
│       │   │   │   └── page.tsx
│       │   │   ├── campaigns/
│       │   │   │   ├── new/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── invoices/
│       │   │   │   └── new/
│       │   │   │       └── page.tsx
│       │   │   ├── partners/
│       │   │   │   └── page.tsx
│       │   │   └── page.tsx
│       │   ├── pay/
│       │   │   └── [invoiceId]/
│       │   │       └── page.tsx
│       │   ├── receipt/
│       │   │   └── [invoiceId]/
│       │   │       └── page.tsx
│       │   ├── wallet/
│       │   │   └── page.tsx
│       │   ├── error.tsx
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── loading.tsx
│       │   ├── not-found.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── ui/
│       │   │   └── button.tsx
│       │   ├── checkout.tsx
│       │   ├── customer-wallet.tsx
│       │   ├── field.tsx
│       │   ├── merchant.tsx
│       │   ├── providers.tsx
│       │   ├── shell.tsx
│       │   ├── transaction.tsx
│       │   └── wallet.tsx
│       ├── lib/
│       │   ├── db.ts
│       │   ├── forms.test.ts
│       │   ├── forms.ts
│       │   ├── network.ts
│       │   ├── use-looppay.ts
│       │   └── utils.ts
│       ├── tests/
│       │   ├── chain.spec.ts
│       │   └── flow.spec.ts
│       ├── components.json
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── playwright.config.ts
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── docs/
│   ├── architecture.md
│   ├── file-tree.md
│   ├── hackathon-submission.md
│   ├── mainnet-checklist.md
│   ├── security.md
│   └── verification.md
├── packages/
│   ├── config/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── contracts/
│   │   ├── script/
│   │   │   └── Deploy.s.sol
│   │   ├── src/
│   │   │   ├── interfaces/
│   │   │   │   └── ILoopPayRewards.sol
│   │   │   ├── mocks/
│   │   │   │   └── MockStablecoin.sol
│   │   │   ├── LoopPayCheckout.sol
│   │   │   ├── LoopPayRegistry.sol
│   │   │   └── LoopPayRewards.sol
│   │   ├── test/
│   │   │   ├── LoopPay.t.sol
│   │   │   └── Reentrancy.t.sol
│   │   ├── foundry.toml
│   │   └── package.json
│   └── sdk/
│       ├── examples/
│       │   ├── integration.ts
│       │   └── local.ts
│       ├── src/
│       │   ├── abi.ts
│       │   └── index.ts
│       ├── tests/
│       │   └── amount.test.ts
│       ├── package.json
│       └── tsconfig.json
├── scripts/
│   ├── abi.mjs
│   ├── configure-local.ts
│   ├── db.mjs
│   ├── deploy.mjs
│   ├── prepare-local.mjs
│   ├── setup.sh
│   └── verify.mjs
├── .env.example
├── .gitignore
├── .prettierignore
├── LICENSE
├── README.md
├── docker-compose.yml
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── vitest.config.ts
```

The repository root also contains the Codespaces and GitHub Actions entry points that run this nested monorepo. Generated ABIs are checked in; build artifacts, local configuration and broadcast files are ignored.
