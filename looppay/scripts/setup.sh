#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
corepack enable
pnpm install --frozen-lockfile
# Foundry binaries are pinned through the pnpm lockfile; no remote installer is piped to a shell.
pnpm exec forge --version
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -f apps/web/.env.local ]; then ln -s ../../.env apps/web/.env.local; fi
pnpm db:generate
pnpm db:up
pnpm db:migrate
printf '%s\n' 'Ready. Run pnpm contracts:anvil in another terminal, then follow README local deployment steps.'
