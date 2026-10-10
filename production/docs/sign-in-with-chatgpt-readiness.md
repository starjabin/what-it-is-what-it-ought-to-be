# ContractGap — Sign in with ChatGPT readiness

Status: integration-ready, disabled until OpenAI approval.

## OpenAI commercial availability
Sign in with ChatGPT for commercial websites is currently offered to selected commercial partners. ContractGap should request:
- Sign in only: yes.
- Sign in and ChatGPT plan use for AI requests: yes.

The two permissions are separate. Identity must work even when a customer declines ChatGPT-plan usage.

## Product integration architecture
ContractGap already uses Supabase Auth. After OpenAI issues the commercial OAuth/OIDC client credentials, configure OpenAI as a Supabase custom OIDC provider using identifier `custom:chatgpt`.

Expected identity flow:
1. User selects **Continue with ChatGPT**.
2. Supabase starts OIDC Authorization Code + PKCE.
3. OpenAI authenticates and returns the verified identity to the Supabase callback.
4. Supabase creates/links the local user and issues the normal ContractGap session.
5. Existing RLS, tenant membership, onboarding and audit rules continue unchanged.

The app already contains a feature-gated Continue with ChatGPT button. Set:
`NEXT_PUBLIC_CHATGPT_SIGN_IN_ENABLED=true`
only after OpenAI and Supabase provider configuration are complete.

## Registration values to prepare
- Product: ContractGap / What It Is — What It Ought to Be
- Website: https://what-it-is-what-it-ought-to-be.vercel.app
- Supabase OIDC callback: https://cwrcvidbadipyckhxddg.supabase.co/auth/v1/callback
- Requested identity scopes: `openid profile email`
- Requested additional capability: ChatGPT plan usage for eligible AI requests.
- Primary commercial region: EMEA
- Primary market: Saudi Arabia / GCC

## Security position
- ContractGap receives only approved identity claims for sign-in.
- ChatGPT conversations, memory, files and billing data are not requested.
- Contract/project evidence remains in the ContractGap tenant boundary.
- ChatGPT-plan usage, when approved, must use a separate explicit user permission.
- AI-generated contract findings remain proposals requiring human review.

## Activation checklist after approval
1. Receive OpenAI client ID (typically `oaiapp_...`) and registered client credentials/endpoints.
2. Register the exact Supabase Auth callback with OpenAI.
3. Create Supabase custom OIDC provider `custom:chatgpt`.
4. Verify sign-in and same-email account linking.
5. Enable `NEXT_PUBLIC_CHATGPT_SIGN_IN_ENABLED=true` in Vercel.
6. Run identity-only acceptance tests.
7. Implement and test the separately approved ChatGPT-plan usage scopes/tokens.
8. Add disconnect/manage-usage UI only after the plan-usage contract is confirmed.
