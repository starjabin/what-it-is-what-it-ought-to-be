# AI control register — staging release gate

The controlled execution modules and SQL candidate are not connected to the live endpoint. The existing endpoint is not covered by these controls. This register is the acceptance contract.

| Control | Enforcement | Required acceptance evidence |
|---|---|---|
| Authorization | Server derives actor from verified session; database rechecks contract tenant and role at reservation, attempt, completion | Two tenants, revoked membership, anonymous and direct RPC access denied |
| Provider policy | Explicit tenant-approved independent providers; typed outage only, no fallback on auth/validation failure | Mock tests pass; live two-provider approval, outage, data residency and terms verification pending |
| Budget | Reserve 1–8 attempts before dispatch, serialize on tenant limit row, debit before every provider call; 15-minute expiry; no refunds by default | Parallel reservations at cap, duplicate request rejection, stale reservation denial, secondary consumes attempt |
| Subscription | Check active plan at reservation and debit; legacy runs counted but legacy path does not share lock | Disable or migrate legacy path and test simultaneous runs; recheck plan before each call before release |
| Atomic persistence | One service-only RPC commits AI run, output, gap, evidence links, citations, audit and job completion | Force each insert to fail; confirm no partial records. Replay finish; exactly one gap. |
| Evidence | Resolve source IDs by tenant, contract, project and current ready revision; no AI confirmation | Wrong tenant, duplicate, stale revision, missing source; test revision changes while completing; verify both obligations and evidence semantically |
| Approval | Candidate always Under Review; no autonomous approvals or field work | Author cannot approve own proposal, unconfirmed actions blocked, independent closure tested |
| Audit | Record provider attempt history and completion event | Add per-specialist outcome, timestamps, actual tokens/cost, failure transitions and protected retention |
| Monetary exposure | Attempt reservation is not a monetary cap | Approved pricing, input/output token accounting, conservative monetary reservation, reconciliation and provider-side caps before enabling live spend |
| Availability | Timeout and failure gates; no blind fallback | Actual runner failure, cancellation, manual-review queue and recovery |
| Release | Draft PR only, production untouched | CI startup fixed; full build, SQL staging, concurrency, browser and security acceptance passed |

## Database rollout
SQL is a review candidate in docs/staging, not an executable migration in the deployment pipeline. It requires the dedicated staging database and Supabase CLI. Review all existing policies and triggers; generate migration via the CLI, validate transaction rollback and run advisors before release. Service role functions are security invoker, with grants restricted to service_role. Use a server-only client; never accept a client-supplied actor. Do not configure live providers or attach the new route until reservation and completion are wired and tested. The existing gap UI and old endpoints remain unchanged.

## Local evidence
Six new provider-control tests passed and strict standalone TypeScript typecheck passed. Git blob hashes: provider-control.ts ce0d549490aa954b951b97aabb7d8971ae64d9ba; provider-control.test.mjs ebba194d00f34eaf4b35109b5c7cbc37a363490a. No live provider call or database SQL execution performed. Remote CI startup failure persists.

## GC-05 implementation update
The server reservation adapter and mandatory OpenAI specialist debit are committed. Eight local mocked-RPC tests and standalone strict TypeScript typecheck passed. The SQL candidate includes 15-minute expiry, subscription recheck before each debit and idempotent failure closure that preserves completed jobs. Default 4 attempts for four specialists; up to 8 only if approved fallback is enabled in a later integration. Reserved capacity is retained even if unused or failed. The adapter and SQL are not wired to a live endpoint; the existing legacy endpoint can still bypass the new control. Before release, use a server-only RPC binding, verified session actor, dedicated staging database, concurrency and rollback tests; reconcile abandoned jobs and verify provider SDK compatibility. This is an attempt cap, not a monetary spending cap.
