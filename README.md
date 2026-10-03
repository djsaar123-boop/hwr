# HWR — Holistic Wellbeing Report

Wellness coach platform. The MVP covers the Health · Wealth · Relationships assessment → scorecard → coach on WhatsApp / sign-up → journey dashboard, plus admin for the question bank.

## Run it

1. Set up Supabase: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Run `schema.sql`, `seed.sql`, then `migrations/002_na_tips_claims.sql`.
2. `cp .env.example .env.local`, then fill in the URL and publishable key.
3. `npm install && npm run dev`, then open http://localhost:3000
4. Make yourself admin (after signing up once): `update profiles set role = 'admin' where email = 'you@…';`

## Map

| Path | What |
|---|---|
| `/` | Landing → Begin |
| `/assess` | Bubble picker → area list → questions (anonymous, resumable) |
| `/result/[id]` | Scorecard: ring, area cards, strengths, growth tips, WhatsApp + sign-up CTAs |
| `/signup`, `/login` | Email magic link. Sign-up upgrades the guest in place; login moves guest results into the account |
| `/dashboard` | Journey chart, history, retake, profile (name, phone) |
| `/admin` | Overview · Areas & questions · Score bands · Submissions (CSV) · Settings (coach WhatsApp) |

Code: `src/components/assess/*` (the flow, per [docs/VISUAL_BRIEF.md](docs/VISUAL_BRIEF.md)), `src/lib/report.ts` (strengths, growth, WhatsApp link), scoring in Postgres (`complete_assessment()` in `supabase/schema.sql`).

## Docs
- [docs/PLAN.md](docs/PLAN.md): scope, scoring, stack, phases, hosting
- [docs/VISUAL_BRIEF.md](docs/VISUAL_BRIEF.md): design and interaction contract
- [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md): database setup
