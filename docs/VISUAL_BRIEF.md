# HWR Assessment — Visual & Interaction Brief

> Use this as the system prompt / design contract for anyone (human or AI) building or changing the assessment UI.
> If a design choice isn't covered here, pick the calmer option.

---

## The prompt

You are designing the **Holistic Wellbeing Report (HWR)** assessment: 23 questions across three areas
(Health, Wealth & Work, Relationships & Inner World). Most people arrive on a **phone**, from a WhatsApp or
Instagram link, curious but not committed. Your job is to get them from "what is this?" to a
scorecard they trust in about **5 minutes**, and make them feel *seen, not measured*.

The product's emotional register is **a calm, warm coach**, not a fitness app or a game. Think
morning light, paper, breath. Motion exists to **explain where you are and what changed**, never to
decorate. Every animation must answer one of: *where did that come from? where did it go? what did
my tap do?*

### Non-negotiables

1. **Mobile-first, one thumb.** Design at 375×812 first. All tap targets ≥ 48px. Primary actions in
   the bottom third of the screen.
2. **Motion is spatial and continuous.** Elements morph from where they were (shared-element /
   `layoutId` transitions). Nothing pops in from nowhere. Nothing teleports.
3. **Only animate `transform` and `opacity`.** 60fps on a mid-range Android. No layout thrash, no
   animating `height`/`top`/`box-shadow` blur on large surfaces.
4. **Durations:** micro-feedback 120–180ms; element transitions 280–420ms; scene changes ≤ 600ms.
   Easing: a soft ease-out (`[0.22, 1, 0.36, 1]`) for entrances, spring (stiffness ~260, damping ~28)
   for morphs. **No bounce, no overshoot > 2%.**
5. **`prefers-reduced-motion`:** replace movement with cross-fades, stop bubble drift, keep auto-advance.
6. **No scores during the flow.** No points, tiers, or "right answer" signals while answering. The
   scorecard is the payoff, and showing numbers mid-flow makes people game their answers.
7. **Never shame.** No red for low scores. Low areas are "growth areas", in warm amber. Copy is
   kind, specific, and slightly playful, matching the question bank's voice.
8. **Accessible:** WCAG AA contrast on every surface (including text on area colours), full keyboard
   support (`1–4` to answer, `←` back, `Enter` continue), visible focus rings, screen-reader labels on
   bubbles and option tiles, `aria-live` announcement of question changes.

### Banned (this is what "stupid" looks like)

- Bubbles bouncing off walls like a DVD screensaver, or physics that make the target hard to tap.
- Confetti, fireworks, trophy pop-ups, slot-machine number spins.
- Neon gradients, glassmorphism stacked on glassmorphism, drop shadows on everything.
- Loading spinners for content that's already local. Questions are prefetched, so transitions are instant.
- Progress bars that lie (jumping back, or "almost done" at 40%).
- Emoji used as decoration *and* as data in the same place. Emoji belong to options and area names only.
- Charts with one data point drawn as a "trend line". Empty charts with fake data.
- Modals for anything in the main flow.

---

## Screen-by-screen spec

### 0. Landing / intro (single screen)
- Headline: *"Your 5-minute holistic wellbeing check-in"*. Sub: *"Health · Wealth · Relationships."*
- One primary button: **Begin**. Small print: "No sign-up needed. Takes ~5 min."
- Tapping Begin starts an anonymous session (Supabase anonymous auth) in the background, with no visible wait.

### 1. Area picker — "Pick any area to start the assessment"
- Three **bubbles**, one per area: emoji, area name, and "9 questions · ~2 min" in small text.
- **Drift, don't float:** each bubble translates within ±6–10px and rotates within ±1.5° on a slow loop
  (7–11s, each out of phase). They never overlap or leave their slot. Layout is a loose triangle on
  mobile and a row on desktop.
- Bubble size is equal. Don't encode weight in size; it reads as "this one matters more".
- Surface: soft solid fill in the area's tint (≈12% of the area colour on the background) with a 1px
  inner highlight. No heavy glass.
- **Press:** scale 0.97 on press, then the tapped bubble **expands to fill the screen** (scale + border
  radius morph) and becomes the area screen's background tint. The other bubbles fade and drift outward.
- **Completed bubble:** shrinks to ~80%, fills with the solid area colour, shows a ✓ and "Done". It
  stays tappable, so the person can review and change answers. No score shown.
- **Auto-open rule:** when only one area remains, don't wait for a tap. Show the picker for ~1.2s:
  completed bubbles settle, the last bubble glides to the centre, the label "Last one: Relationships"
  fades in, and it auto-expands. A subtle "tap to start now" lets impatient users skip the wait.

### 2. Area screen — question list → first question
- **Beat 1, the map (≈ 700ms total):** slim cards (≈ 52px tall, full-width, rounded 14px) cascade in
  top-to-bottom with a **40ms stagger**, each sliding up 12px and fading in. Each card shows the
  question's short label and emoji ("🌈 Plant Diversity", "💩 Gut Health", "😴 Sleep Quality", …). The
  point is to show the person the whole area before they start.
- **Beat 2, focus (starts automatically ~300ms after the last card lands):** the first slim card
  **morphs** (shared layout) into the full question card. The rest of the list compresses:
  - **Mobile:** into a horizontal **progress rail** pinned to the top, with small chips for each question
    (✓ done · ● current · ○ upcoming), scrollable and tappable to jump back.
  - **Desktop (≥ 1024px):** into a left-hand column list; the question card sits on the right.
- **Question card contents (top to bottom):**
  1. Emoji + title ("Plant Power Diversity")
  2. *Did you know* fact, small and muted (one line, two at most)
  3. The question prompt, large and readable (20–22px)
  4. **Four option tiles**, stacked full width: emoji on the left, label on the right, min-height 56px
- **Answering:** tap → tile fills with the area colour plus a ✓ (150ms) → hold 350ms so the person sees
  what they picked → card collapses back into its chip/list slot (now ✓) → next card expands. **Auto-advance
  on every answer**, and there is no "Next" button.
- **Back:** top-left chevron, or tap any done chip. Changing an answer re-advances the same way.
- **Progress:** "Health · 3 of 9" above the card, plus one hairline bar for overall progress (x/23)
  at the very top of the screen across all areas.
- **Area complete:** the last chip ticks, the whole rail gives one gentle pulse (opacity, not scale), and after
  600ms the screen **contracts back into its bubble** on the picker (the reverse of the expand). The
  person lands on the picker with that bubble now completed.

### 3. Calculating (≤ 1.2s, real work only)
- "Bringing it all together…" with the three area colours slowly converging into one ring. If the
  scorecard is ready sooner, skip straight to it. Never pad the wait.

### 4. Scorecard (the payoff)
- **Hero:** a single ring split into **three arcs whose lengths equal each area's share of the total**
  (Health 30%, Wealth 30%, Relationships 40%, computed from weights, not hard-coded). Each arc fills to
  its score with a 900ms ease-out, in sequence. In the centre the score counts up to **6.7 / 10** and
  the band label fades in beneath: *🌱 Building Momentum*.
  - This is the one chart that matters: it shows the total, each area, and how the areas are weighted, all at once.
- **Area cards (3):** area name, `2.05 / 3.0`, a horizontal bar, percentage, and a one-line reflection.
  Tap a card to expand per-question rows (label, chosen option, small dot meter, no raw points).
- **Strengths at a glance:** the top-tier answers, ordered by weight (max 4).
- **Highest-leverage growth areas:** the 3 questions with the largest gap (`weight − points`), each with
  a one-line, kind, specific nudge.
- **Reflection prompt:** one question for the person to sit with.
- **CTA block (sticky at the bottom on mobile once the person scrolls past the hero):**
  - Primary: **💬 Talk to a coach on WhatsApp**, which opens `wa.me/<coach>?text=<prefilled summary>`
  - Secondary: **Save my results & track my journey**, which leads to sign-up. Their anonymous results carry over, so they don't retake anything.
  - The copy should give a reason: *"Retake in 30 days and see what moved."*

### 5. Dashboard (signed-in home)
- Top: the latest score ring (small) + band + "Retake assessment" button (shows "Next check-in in 12 days"
  if the last one was recent; retaking is still allowed).
- **Journey chart:** overall score over time (0–10) as the thick primary line, with the three areas as thin
  lines in their colours, toggled via a legend. Show dots on actual check-ins, with no smoothing that
  invents values between them.
  - **With 1 check-in:** show a single labelled dot and the text *"Your next check-in draws your first
    trend line."* Never draw a flat fake line.
- Below: history list of past assessments, each opening its scorecard.

---

## Visual system

- **Palette (tokens, light + dark):** warm off-white background (`#FBF8F3`), ink text (`#1F2421`),
  muted (`#6B6F6A`). Area colours: **Health** sage `#5E9C76`, **Wealth** ochre `#C9973F`,
  **Relationships** rose `#C46B78`. Growth/attention: amber `#D98B2B`. Check every text/fill pair for AA contrast.
- **Type:** one humanist sans (e.g. *Inter* or *Plus Jakarta Sans*) for UI, and an optional soft serif
  (*Fraunces*) only for the score number and band label. Base 16px, question prompt 20–22px.
- **Shape:** generous radius (14–24px), 1px hairline borders over shadows, lots of whitespace.
- **Iconography:** the emoji from the question bank are the icon set. Don't mix in a second icon style
  except for UI chrome (chevron, check, close).

## Copy voice
Warm, plain, a little cheeky, the same voice as the question bank ("Bristol Stool Chart, yes, we're going
there!"). Second person. No clinical language, no diagnoses. A score is described as "a snapshot, not a grade".
