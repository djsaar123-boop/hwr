import type { Answer, Area, AreaScore, Assessment, CoachSettings, Option, Question } from "./types";

export type ReportRow = {
  question: Question | null;
  option: Option | null;
  area: Area | null;
  label: string;
  emoji: string;
  answerLabel: string;
  answerEmoji: string;
  weight: number;
  points: number;
  fraction: number;
  na: boolean;
  gap: number;
};

/** Joins snapshotted answers with the current bank for display. Scores always come from the snapshot. */
export function buildRows(answers: Answer[], areas: Area[]): ReportRow[] {
  const qIndex = new Map<string, { q: Question; area: Area }>();
  areas.forEach((area) => area.questions.forEach((q) => qIndex.set(q.id, { q, area })));

  return answers
    .map((a) => {
      const hit = qIndex.get(a.question_id);
      const option = hit?.q.options.find((o) => o.id === a.option_id) ?? null;
      const na = Number(a.weight) === 0;
      return {
        question: hit?.q ?? null,
        option,
        area: hit?.area ?? areas.find((x) => x.id === a.area_id) ?? null,
        label: hit?.q.short_label ?? "Archived question",
        emoji: hit?.q.emoji ?? "•",
        answerLabel: option?.label ?? "—",
        answerEmoji: option?.emoji ?? "",
        weight: Number(a.weight),
        points: Number(a.points),
        fraction: Number(a.score_fraction),
        na,
        gap: na ? 0 : Number(a.weight) - Number(a.points),
      };
    })
    .sort((x, y) => {
      const ax = x.area?.sort_order ?? 99;
      const ay = y.area?.sort_order ?? 99;
      return ax - ay || (x.question?.sort_order ?? 99) - (y.question?.sort_order ?? 99);
    });
}

export function strengths(rows: ReportRow[], n = 4) {
  return rows
    .filter((r) => !r.na && r.fraction >= 0.999)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

export function growthAreas(rows: ReportRow[], n = 3) {
  return rows
    .filter((r) => !r.na && r.gap > 0.001)
    .sort((a, b) => b.gap - a.gap || b.weight - a.weight)
    .slice(0, n);
}

export function areaReflection(area: AreaScore, rows: ReportRow[]) {
  const mine = rows.filter((r) => r.area?.id === area.area_id && !r.na);
  if (!mine.length) return "Nothing to score here this time.";
  const best = [...mine].sort((a, b) => b.fraction - a.fraction || b.weight - a.weight)[0];
  const worst = [...mine].sort((a, b) => b.gap - a.gap)[0];
  const pct = area.pct ?? 0;
  if (pct >= 90) return `A genuine strength. ${best.label} especially — protect what's working.`;
  if (worst.gap < 0.001) return `Solid across the board, led by ${best.label}.`;
  if (pct < 35) return `This is where a little attention goes a long way — start with ${worst.label}.`;
  return `${best.label} is working for you. ${worst.label} is where a small change goes furthest.`;
}

const REFLECTION_BY_AREA: Record<string, string> = {
  health: "What does your body need more of this week — and what's one small way to give it?",
  wealth: "What would one extra hour of true rest this week make possible?",
  relationship: "What does “being here now” feel like in your body, right now, reading this?",
};

export function reflectionPrompt(areaScores: AreaScore[]) {
  const lowest = [...areaScores].filter((a) => a.max > 0).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];
  return (
    (lowest && REFLECTION_BY_AREA[lowest.slug]) ??
    "When did you last create something just because it felt good — no outcome attached?"
  );
}

export function fmt(n: number | null | undefined, digits = 1) {
  return n == null ? "—" : Number(n).toFixed(digits);
}

/** wa.me link; placeholders: {score} {band} {areas} and {<area slug>} → "68%". */
export function whatsappUrl(coach: CoachSettings, a: Pick<Assessment, "total_score" | "band_label" | "area_scores">) {
  const areas = a.area_scores ?? [];
  let text = coach.message || "Hi! I just took the HWR assessment and scored {score}/10 ({band}).";
  text = text
    .replaceAll("{score}", fmt(a.total_score))
    .replaceAll("{band}", a.band_label ?? "")
    .replaceAll("{areas}", areas.map((s) => `${s.name} ${s.pct ?? 0}%`).join(", "));
  areas.forEach((s) => (text = text.replaceAll(`{${s.slug}}`, `${s.pct ?? 0}%`)));
  const digits = coach.number.replace(/\D/g, "");
  const valid = digits.length >= 8 && digits.length <= 15;
  return `https://wa.me/${valid ? digits : ""}?text=${encodeURIComponent(text)}`;
}
