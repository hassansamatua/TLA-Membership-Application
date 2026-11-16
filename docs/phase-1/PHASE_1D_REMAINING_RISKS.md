# Phase 1D Remaining Risks

Date: 2026-11-04

Phase 1D implementation and disposable verification are complete, but **Phase 1D is not accepted**. A separately authorized independent review remains required.

## Confirmed remaining risks

1. Repository-wide TypeScript fails with 340 diagnostic lines across generated route types, legacy API/auth code, components and `lib/db-utils.ts`.
2. Repository-wide ESLint fails with 673 problems: 451 errors and 222 warnings.
3. Production build passes but skips type validation under existing configuration.
4. Disposable payment test files interfere when run concurrently against the shared `phase1a_test` schema. Sequential execution passed 5/5; test infrastructure should provide per-suite isolation or enforce sequential scheduling.
5. Discovery queries are bounded and use indexes, but actual plans still use filesort (initiation estimated 27 rows; refund estimated 41 rows). At high volume this needs query/index optimization.
6. The sweeper is service-level only. No authorized scheduler/worker deployment boundary, monitoring, dead-letter policy, or external immutable audit sink exists.
7. Audit failures are counted and contained, but when insertion is impossible there is no local durable fallback for missing evidence.
8. Manual evidence is represented by hashes/metadata; controlled evidence storage and retention are not implemented.
9. Local finance-admin authorization was verified at service level; no administrative UI or HTTP endpoint authorization review is claimed.
10. Actual provider lookup/idempotency/callback semantics remain unknown. AzamPay remains outside this phase.

## Explicit restrictions preserved

No production access, staging/production migration, `next_auth` change, live payment operation, payment endpoint activation, AzamPay integration, credential disclosure, or membership business-rule change occurred.

These results support submitting Phase 1D for independent review, not production deployment or live provider sandbox use.
