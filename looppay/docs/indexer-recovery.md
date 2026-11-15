# Indexer operations and reorg recovery

The indexer verifies RPC chain identity and the checkpoint hash, waits at least two confirmations (default 12), processes logs in chain order, and commits the event journal, projections and checkpoint in one database transaction. Event IDs include chain, transaction hash and log index; duplicate journal events are not projected again. One deployment/network per database is supported.

A checkpoint hash mismatch stops indexing. Recover in the same database:

1. Stop every indexer instance. Back up PostgreSQL using your normal secured operator tooling; keep connection credentials out of command history/logs. Preserve the event journal backup and record old checkpoint/network/deployment.
2. Find the common ancestor using canonical RPC hashes and journal block hashes. Choose `--from-block` as the first block to refetch. Choosing the deployment block is slower but safest when the fork boundary is unknown.
3. Supply the same public deployment configuration, DEPLOYMENT_BLOCK and database environment. Run `pnpm indexer:replay --from-block=<first-block-to-refetch> --confirm-rebuild-projections`.
4. The tool checks network/deployment and verifies every retained event block against RPC. It atomically removes later events, rebuilds all projections from the retained journal in block/log order, and rewinds the checkpoint to the preceding canonical block. It refuses a noncanonical retained journal. A rollback preserves the prior state if rebuilding fails. This is an operator-controlled destructive projection rebuild; it is never automatic.
5. Restart one indexer; it refetches through the confirmed head. Check `/api/readiness`, compare totals and representative receipts, and record the incident and replay boundary. If new canonicality checks fail, stop and choose an earlier boundary from the backup.

For this MVP the replay transaction loads retained events into memory and has a 120-second database timeout. Large deployments need a staged shadow-projection replay and atomic cutover. Do not run replay concurrently with a writer. Never reuse a journal for different contract addresses.

`/api/health` reports web-process liveness only. `/api/readiness` reports public chain ID, database availability, checkpoint, head, lag and canonicality; it returns 503 on mismatched deployment/network, missing checkpoint, RPC/DB failure or lag above INDEXER_MAX_LAG_BLOCKS (default 100). Configure threshold above confirmation depth. No connection URLs or raw errors are returned. This is application readiness, not an audit, identity-verification or mainnet-release signal.
