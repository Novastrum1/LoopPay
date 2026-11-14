# Web hosting

Deploy the repository on Vercel with Root Directory `looppay/apps/web`, Node.js 22, and access to source files outside the root directory. The app's `vercel.json` installs the workspace lockfile, generates Prisma, and builds Next.js. Never upload `.env`, local Anvil addresses, database credentials, keystores, or broadcast artifacts.

The initial hosted release intentionally has no payment network configured. It serves the product, merchant forms and safety documentation with payments disabled. This is not a live mainnet payment service. Local Docker Postgres and the local polling process are not deployed to Vercel.

After QIE testnet deployment and wallet validation, configure the documented public chain, token, contract, explorer and app URL variables in the hosting dashboard. Set the private `DATABASE_URL` directly in the hosting provider, backed by a separate hosted PostgreSQL database. Apply the additive migration through the operator's trusted environment. Run `apps/indexer` as a persistent service against that same database and QIE testnet RPC; never run a perpetual polling loop inside a request function. Rebuild after changing public configuration.

Follow the mainnet checklist before enabling any mainnet configuration. Git pushes and web deployments do not deploy Solidity contracts or authorize mainnet transactions.
