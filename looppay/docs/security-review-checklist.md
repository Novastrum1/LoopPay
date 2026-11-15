# Independent security review

Release is not audited. Record reviewer, commit SHA, scope, findings, severity, remediation and residual risk. Static analysis and tests do not substitute for an external audit.

- Prove reserved <= budget per campaign; aggregate token vault balance >= all campaign budgets; conservation across fund, earn, redeem and refund.
- Check reentrancy across all token callbacks and cross-function entrypoints. Review malicious/nonstandard token assumptions and token-manager governance.
- Confirm only current merchant owner can close/refund, closure cannot reopen, pause is not refundable, and recipient/zero amounts are guarded.
- Check old credits redeem after end/close; global emergency pause temporarily blocks redemption. No credit expiry exists. No admin withdrawal path exists.
- Review owner/current-payout self exclusions, policy mutation, current payout changes, cap lifetime semantics, explicit test marking and analytics exclusions.
- Confirm identity-required mode fails closed; no client claim can enable rewards. Review any future verifier's replay, revocation, domain binding and outage behavior before enabling.
- Confirm exact approval spender and amount, chain-checked simulation and confirmed receipt event matching. Assess cached UI information against transaction-time state.
- Check journal idempotence, checkpoint identity, reorg refusal, atomic replay, confirmation depth, DB migrations, health redaction and least-privilege database accounts.
- Review role grants, multisig/key custody, emergency response, dependencies/licenses, CI on exact commit, environment separation and build-time public variables.
- Confirm verified sources/bytecode/constructor args and official token identity before release. Document all device QA and evidence gaps.

Static analysis (independent reviewer environment): use a separately reviewed, hash-locked installation of crytic/slither, select Solidity 0.8.24, then run `slither . --compile-force-framework foundry --filter-paths 'node_modules|test|script'` from packages/contracts with pinned forge on PATH. Do not curl-pipe installers, globally upgrade tooling, or treat unpinned installation as reproducible. Slither was not installed/run as part of the initial implementation; record exact tool/dependency hashes and triage every finding before claiming analysis results. See https://github.com/crytic/slither for upstream instructions.
