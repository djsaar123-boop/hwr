# HWR — MVP Plan

**Product:** Holistic Wellbeing Report, a wellness coach platform.
**MVP goal:** a stranger takes the 23-question assessment (no sign-up), gets a scorecard, and either
(a) messages the coach on WhatsApp or (b) signs up to track their journey and retake the assessment over time.
Admins manage areas, questions, options, and score bands without code.

Source of truth for content and scoring: `HWR_v3.pdf` (seeded in `supabase/seed.sql`).
Visual and interaction contract: `docs/VISUAL_BRIEF.md`.

---

## 1. Scope

### In (MVP)
| # | Module | What it does |
|---|---|---|
| 1 | **Assessment** | Bubble picker → area question list → one question at a time → auto-advance between areas → last area auto-loads. Anonymous; progress is saved after every answer, so a refresh resumes where they left off. |
| 2 | **Scoring engine** | Weighted, server-side (Postgres function). Weights and tier fractions come from the DB. |
| 3 | **Scorecard** | Overall /10 + band, 3 area scores, strengths, top-3 growth areas, reflection prompt. |
| 4 | **Conversion** | "Talk to a coach" (WhatsApp deep link with a prefilled summary) · "Save & track", which goes to sign-up and carries the anonymous result over. |
| 5 | **User dashboard** | Journey graph (overall + per area over time), history, retake. |
| 6 | **Admin** | CRUD + reorder for areas, questions, and options; edit score bands; set coach WhatsApp number and message; view a submissions list with basic filters + CSV export. |

### Out (later phases)
AI-written emotional narrative (the PDF's section 8, a good fit for Claude in phase 2), wearables, coach
portal, programs/habits, payments, multi-tenant B2B, push/email nudges, multiple languages.

---

## 2. Scoring (from the PDF)

- Every question has a **weight** (max points). Every option has a **score_fraction**: Tier 1 = 1.0,
  Tier 2 = 0.667, Tier 3 = 0.333, Tier 4 = 0.
- `points = weight × score_fraction`
- Area score = Σ points / Σ weights in that area. Current max: Health 3.0 · Wealth 3.0 · Relationships 4.0.
- **Overall = Σ points / Σ weights × 10**, rounded to 1 decimal. This is normalised, so the score stays out of 10 even
  if an admin changes weights so they no longer sum to 10.
- Bands (admin-editable): ≥ 8.5 🌟 Radiant & Thriving · ≥ 7.0 🌈 Flourishing · ≥ 5.5 🌱 Building Momentum ·
  ≥ 4.0 🧭 Finding Your Footing · < 4.0 🕯️ Ready to Awaken.
- **Growth areas** = the 3 answers with the largest `weight − points`. **Strengths** = top-tier answers,
  ordered by weight.
- History stays stable: each answer **snapshots** its weight and fraction at answer time, so an admin
  editing weights later doesn't silently rewrite past scorecards.

Sanity check: all Tier-2 answers → 10 × 0.667 = **6.7 "Building Momentum"**, which matches the sample report.

---

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript** | One codebase for the public flow, the dashboard, and admin. Server actions for writes. |
| UI | **Tailwind CSS** + **shadcn/ui** (admin only) | Fast to build. The assessment UI is custom-built per the brief. |
| Motion | **Motion** (`motion/react`, formerly Framer Motion) | `layoutId` shared-element morphs, which the brief depends on. |
| Charts | **Recharts** for the journey line chart, **hand-rolled SVG** for the score ring | The ring is simple, needs to animate exactly as specified, and doesn't need a library. |
| DB + Auth | **Supabase** (Postgres, Auth with anonymous sign-ins, RLS) | You chose it. Anonymous auth gives a clean "try first, sign up later" flow. |
| Hosting | **Vercel Hobby** now → see §6 | Free, and the best fit for Next.js. |

### Key architecture decisions
1. **Anonymous auth, not a "guest token" hack.** Tapping *Begin* calls `supabase.auth.signInAnonymously()`.
   The person is a real (anonymous) user, so RLS works the same for everyone. On "Save & track" we call
   `updateUser({ email })` or link Google, which **turns the same user into a permanent one**. Their
   assessment is already theirs, and no data migration is needed.
2. **Scores are computed in Postgres** (`complete_assessment()`), never trusted from the browser.
   Answer points are filled in by a trigger.
3. **Question bank is fetched once** at the start (≈ 23 questions, a few KB) and cached, which keeps transitions instant.
4. **Admins delete safely:** deleting a question or option that has answers **archives** it
   (`is_active = false`) instead. Deleting one with no answers removes it.
5. **Roles** live in `profiles.role` (`user | coach | admin`). Users can't change their own role (column-level grants).

---

## 4. Routes

```
/                       Landing (Begin)
/assess                 Bubble picker + area flow (single client-side route, state machine)
/assess/result/[id]     Scorecard (own results only; RLS-protected)
/signup  /login         Email magic link + Google
/dashboard              Journey graph, latest score, history, retake
/admin                  Overview (submissions count, avg score, completion rate)
/admin/areas            Areas list → questions → options (drag to reorder)
/admin/bands            Score bands
/admin/settings         Coach WhatsApp number + prefilled message template
/admin/submissions      Table + CSV export
```

The assessment is a **client-side state machine** (`intro → picker → area:list → area:question[i] → area:done →
picker | autoLaunchLast → calculating → result`). Answers are upserted to Supabase in the background after each tap.

---

## 5. Build phases

| Phase | Deliverable | Est. |
|---|---|---|
| **0. Setup** | Supabase project ([SUPABASE_SETUP.md](SUPABASE_SETUP.md)), Next.js repo, env, deploy pipeline | 0.5 day |
| **1. Data** | Schema + RLS + scoring function + seed (written: `supabase/`), typed client | 0.5 day |
| **2. Assessment UX** | Picker bubbles, list cascade, question morph, auto-advance, auto-launch last area, resume, reduced-motion | 3 days |
| **3. Scorecard + CTA** | Score ring, area cards, strengths/growth, WhatsApp deep link, sign-up carry-over | 1.5 days |
| **4. Auth + Dashboard** | Magic link/Google, journey chart, history, retake | 1.5 days |
| **5. Admin** | Areas/questions/options CRUD + reorder, bands, settings, submissions + CSV | 2 days |
| **6. QA + launch** | Mobile device pass (iOS Safari, Android Chrome), a11y audit, Lighthouse ≥ 90, prod deploy, domain | 1 day |

**≈ 10 working days** for one developer working with Claude. Phase 2 is the long pole, and it's where we'll iterate on visuals.

---

## 6. Hosting: free options

| Option | Free tier | Catch | Verdict |
|---|---|---|---|
| **Vercel Hobby** | Generous; zero-config Next.js | **Non-commercial use only** per their terms | ✅ Use for building, demos, and a pilot with friends |
| **Cloudflare Workers** (via OpenNext) | Very generous; commercial use OK | Slightly more setup; a few Next.js features need care | ✅ Best free option once real clients pay |
| **Netlify Free** | Credit-based free plan; commercial OK | Tighter limits | Fine fallback |

**Recommendation:** start on **Vercel Hobby**. When you start charging clients, either move to
**Cloudflare (free)** or pay **Vercel Pro ($20/mo)**. The code doesn't change either way.

**Supabase free tier:** 500 MB DB and 50k monthly active users, which is plenty for an MVP. **Caveat:** free projects
**pause after ~7 days of no activity**. Fine during the build. Before launch, either upgrade
to Pro ($25/mo) or add a daily keep-alive ping.

---

## 7. Decisions & open questions

**Decided (2 Oct 2026):**
1. **"Not applicable / Single by choice"** on *Partner Relationship* counts as N/A. It's excluded from both
   points and max, so the score is re-normalised (`options.is_na`, migration 002). Admins can mark any option N/A.
2. **Sign-up** is an email magic link. Phone is a profile field only, with no OTP.
3. **One coach.** A single WhatsApp number is set in `/admin/settings`.

**Still open (defaults applied):**
- **Gut health "I don't pay attention"** scores 0. That's probably intended, so I've kept it.
- **Retake cadence:** I assumed 30 days as a suggestion, without blocking earlier retakes.
- **Option order:** I'm keeping the PDF's best→worst order. Shuffling reduces bias but feels odd for scales. Keep?
- **Data/privacy:** wellbeing data is sensitive. MVP includes a consent line on the landing page plus delete-my-data in the
   dashboard. Do you need a formal privacy policy (DPDP Act if your users are in India)?
