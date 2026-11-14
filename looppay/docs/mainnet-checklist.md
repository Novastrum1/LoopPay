# Manual mainnet release gates

Mainnet deployment is not implemented or authorized by any default script. Development scripts reject it. Do not prepare or execute the reviewed mainnet command until every prerequisite below has evidence attached.

- [ ] Contract review by another engineer: access control, reentrancy, invoice lifecycle, vault conservation, duplicate earning/redemption, code size, issuer behavior; independent audit strongly recommended before material funds.
- [ ] All lint/typechecks, frontend build, TypeScript tests, Playwright, Foundry tests, fuzzing and coverage pass on the release commit. Review coverage gaps, not only the percentage.
- [ ] Local integration and QIE testnet deployment succeed; record release commit, compiler/settings, addresses, deployment blocks and receipts.
- [ ] Official QIE source-verification workflow confirmed; all testnet sources verified against exact artifacts, including constructor arguments and dependencies.
- [ ] Confirm QIE Stable Coin’s canonical mainnet address, decimals, symbol and transfer behavior from official QIE sources. Never approve a mock. Inspect issuer freeze/rebase/tax/upgrade capabilities.
- [ ] Confirm current mainnet chain ID, RPC and explorer in official docs. Check RPC chain ID independently before any signing.
- [ ] Validate real QIE Wallet desktop/mobile UX, discovery, network switch/add, rejection, exact approval, gas insufficiency and confirmation states. Mobile deep linking is not implemented in this MVP.
- [ ] Validate all deployed addresses, immutable cross references, runtime bytecode and token allowlist; verify no deployer or token address is accidentally zero or from testnet.
- [ ] Assign DEFAULT_ADMIN_ROLE, TOKEN_MANAGER_ROLE and PAUSER_ROLE to reviewed multisig/operational accounts; remove unnecessary deployer authority after verification. Admin can grant roles; there is no timelock in v1.
- [ ] Obtain explicit human approval of the exact mainnet release script and command, RPC chain, signer account reference and token. The command must use an encrypted signer account reference, never a private key CLI flag. Record it in the release issue **only after testnet gates succeed**.
- [ ] After approved deployment, verify mainnet source, run a deliberately reviewed minimal test payment and partner redemption, inspect transfers and liabilities. No automated mainnet test is included.
- [ ] Monitoring active: RPC failures, block lag, checkpoint hash mismatch, paused state, allowlist/role/payout changes, budget exhaustion, vault asset/liability reconciliation, DB backups.
- [ ] Pause plan rehearsed on testnet: authorized PAUSER calls Registry `setPaused(true)` and checks transactional flows stop; communicate; diagnose; re-review before unpause.
- [ ] Rollback plan documented: contracts are immutable, no proxy rollback or asset confiscation. Pause affected deployment, preserve historical receipts, publish a new reviewed version if needed. Existing vault liabilities require a customer-preserving migration plan; no admin sweep exists.
- [ ] Publish business reward terms explaining locked funds, earned-credit permanence, token risks, no refunds and merchant delivery responsibility.

Release evidence / reviewer / date / reviewed command: **PENDING — do not deploy mainnet.**
