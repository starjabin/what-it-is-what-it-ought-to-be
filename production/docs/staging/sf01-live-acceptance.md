# SF-01 live authentication and evidence acceptance

**Target:** dedicated GAP CONTROLS identity staging only. No production, real contracts or customer data. Do not run in public CI; never commit credentials, session tokens, TOTP secrets or private evidence. The runner performs password sign-in, a real TOTP challenge, verified JWT issuer/audience/subject checks, AAL1 rejection, own-tenant data and actual source byte verification, and cross-tenant denial in both directions. No fixture writes or approvals. It signs out locally afterward.

Prerequisites: owner provisions two synthetic staging identities using the supported Supabase Auth dashboard/admin workflow, enrolls each TOTP in the protected staging application, grants separate organization/project memberships and uploads one synthetic file per tenant in the app. Record only the non-secret org/project/version IDs in local environment. Do not use production accounts, privileged keys or bypass MFA. The staging publishable key is available from the staging project dashboard.

Run from production directory after the pinned dependencies are installed:
```sh
# Set these locally (not in a repository or shared shell history).
# SF01_PUBLISHABLE_KEY, SF01_A_EMAIL, SF01_A_ORG, SF01_A_PROJECT, SF01_A_VERSION
# SF01_B_EMAIL, SF01_B_ORG, SF01_B_PROJECT, SF01_B_VERSION
node --experimental-strip-types docs/staging/sf01-live-acceptance.mjs
```
Passwords and fresh codes are requested interactively and not printed. Pass criteria: all PASS lines and exit 0; record UTC time, exact commit, test case labels and status only. Run the actual browser upload/revision/download, independent reviewer correction/closure, concurrent mutations and restore checks separately; this runner does not establish those controls. No live users or MFA factors existed at the initial catalog check on 27 November 2026. Live auth is not accepted until these steps execute.