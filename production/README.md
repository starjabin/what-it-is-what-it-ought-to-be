# What It Is / What It Ought to Be — Production Application

Production-track international Contract Intelligence SaaS.

## Stack
- Next.js 16 App Router + React 19
- Supabase Auth + PostgreSQL + Row Level Security
- OpenAI Responses API with Structured Outputs
- Provider-neutral billing boundary
- Node.js 22+

## Run
```bash
cd production
cp .env.example .env.local
npm install
npm run dev
```

Without service credentials the interface runs in safe demo mode. Add Supabase/OpenAI environment variables to activate live boundaries.

Apply `supabase/migrations/001_core.sql` to a Supabase project.

AI proposes; humans confirm consequential findings. Operational records remain structured and evidence-traceable.

Use `production` as the project root on a Next.js-compatible host. The GitHub Pages pilot remains independent until production hosting is connected.
