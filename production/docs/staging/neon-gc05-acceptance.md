# Neon staging GC-05 acceptance — 2026-11-25

- Dedicated free-plan project `gap-controls-staging`, PostgreSQL 17.12, AWS eu-central-1, 0.25 CU, plan-default idle suspension. No production or Supabase modification; no credentials committed.
- Installed GC-05 reservation, consumption, failure RPCs from verified CI source. Synthetic prerequisite tables only, no production data. Service role is NOLOGIN, without BYPASSRLS; explicit service policies on both control tables. Anonymous/authenticated direct RPC access denied. Owner role membership is for fixture testing only.
- 12 parallel reservation requests: 2 accepted, 10 correctly denied; total reserved 8. 10 parallel debit requests: 4 accepted, 6 correctly denied; persisted history count 4.
- Cross-tenant actor denied, anonymous/authenticated RPC denied, duplicate request denied, unapproved provider denied, paused synthetic subscription denied, expired reservation denied, repeated failure closure safe with reserved capacity retained. Both control tables RLS enabled.
- Prior GitHub Actions run 45568836909: 26/26 unit tests, disposable PostgreSQL fixture, typecheck and Next.js build passed.
- Scope limitation: the cloud test is a synthetic GC-05 database, not the full application schema or real Supabase Auth. Completion RPC, live AI provider, server-only least-privilege application connection, authenticated identity binding, full migration and monetary cap remain pending. Do not direct the production application to this database.
- Next: establish a staging-only authenticated server adapter to Neon, run an end-to-end synthetic provider test, then integrate complete schema and independent review. No deployment or merge authorized by these results.
