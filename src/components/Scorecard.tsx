"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type ReportRow, areaReflection, fmt, growthAreas, reflectionPrompt, strengths } from "@/lib/report";
import type { Assessment, AreaScore } from "@/lib/types";
import { EASE_OUT, areaStyle, cx } from "@/lib/ui";
import ScoreRing from "./ScoreRing";

export type ViewerMode = "guest" | "member" | "viewer";

type Props = {
  assessment: Assessment;
  rows: ReportRow[];
  bandMessage: string | null;
  whatsappHref: string;
  mode: ViewerMode;
};

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { delay, duration: 0.45, ease: EASE_OUT },
});

export default function Scorecard({ assessment: a, rows, bandMessage, whatsappHref, mode }: Props) {
  const areas = a.area_scores ?? [];
  const top = strengths(rows);
  const grow = growthAreas(rows);
  const heroRef = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const date = new Date(a.completed_at ?? a.started_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-3xl px-4 pb-36 lg:px-8">
      {/* Hero */}
      <section ref={heroRef} className="pt-4 text-center sm:pt-8">
        <p className="text-sm text-muted">Your Holistic Wellbeing Report · {date}</p>
        <div className="mt-6">
          <ScoreRing areas={areas} score={a.total_score} band={a.band_label ? `${a.band_emoji ?? ""} ${a.band_label}` : null} />
        </div>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {areas.map((s) => (
            <li key={s.area_id} className="flex items-center gap-2" style={areaStyle(s.color)}>
              <span className="area-fill size-2.5 rounded-full" />
              {s.name} <span className="text-muted tabular-nums">{s.max > 0 ? `${s.pct}%` : "n/a"}</span>
            </li>
          ))}
        </ul>
        {bandMessage && (
          <motion.p {...reveal(1.7)} className="mx-auto mt-6 max-w-md font-serif text-xl leading-snug text-balance">
            {bandMessage}
          </motion.p>
        )}
        <p className="mt-3 text-xs text-muted">A snapshot, not a grade.</p>
      </section>

      {mode !== "viewer" && <CtaBlock mode={mode} whatsappHref={whatsappHref} className="mt-10" />}

      {/* Areas */}
      <section className="mt-14">
        <h2 className="font-serif text-2xl">Area by area</h2>
        <div className="mt-4 grid gap-3">
          {areas.map((s, i) => (
            <AreaCard key={s.area_id} score={s} rows={rows.filter((r) => r.area?.id === s.area_id)} allRows={rows} delay={i * 0.06} />
          ))}
        </div>
      </section>

      <div className="mt-14 grid gap-10 sm:grid-cols-2">
        {top.length > 0 && (
          <motion.section {...reveal(0)}>
            <h2 className="font-serif text-2xl">Strengths at a glance</h2>
            <ul className="mt-4 grid gap-2">
              {top.map((r) => (
                <li key={r.question?.id ?? r.label} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5" style={areaStyle(r.area?.color ?? "#888")}>
                  <span aria-hidden className="text-xl">{r.emoji}</span>
                  <div>
                    <p className="font-semibold">{r.label}</p>
                    <p className="text-sm text-muted">{r.answerLabel}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
        {grow.length > 0 && (
          <motion.section {...reveal(0.08)}>
            <h2 className="font-serif text-2xl">Highest-leverage growth</h2>
            <ol className="mt-4 grid gap-2">
              {grow.map((r, i) => (
                <li key={r.question?.id ?? r.label} className="rounded-2xl border border-line bg-surface p-3.5">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="grid size-6 place-items-center rounded-full bg-amber/15 text-xs text-amber">{i + 1}</span>
                    <span aria-hidden>{r.emoji}</span> {r.label}
                  </p>
                  {r.question?.tip && <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.question.tip}</p>}
                </li>
              ))}
            </ol>
          </motion.section>
        )}
      </div>

      <motion.section {...reveal(0)} className="mt-14 rounded-3xl border border-line bg-surface p-6 text-center sm:p-8">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">Sit with this</p>
        <p className="mx-auto mt-3 max-w-md font-serif text-[22px] leading-snug text-balance">{reflectionPrompt(areas)}</p>
      </motion.section>

      {mode !== "viewer" && <CtaBlock mode={mode} whatsappHref={whatsappHref} className="mt-10" />}

      {/* Sticky CTA on mobile once the hero has scrolled away */}
      <AnimatePresence>
        {mode !== "viewer" && pastHero && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:hidden"
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#1f7a4d] text-white">
              💬 Talk to a coach on WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function CtaBlock({ mode, whatsappHref, className }: { mode: ViewerMode; whatsappHref: string; className?: string }) {
  return (
    <section className={cx("rounded-3xl border border-line bg-surface p-5 sm:p-7", className)}>
      <p className="font-serif text-xl">What would you like to do next?</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn min-h-13 bg-[#1f7a4d] text-white">
          💬 Talk to a coach on WhatsApp
        </a>
        {mode === "guest" ? (
          <Link href="/signup" className="btn btn-ghost min-h-13">
            Save my results &amp; track my journey
          </Link>
        ) : (
          <Link href="/dashboard" className="btn btn-ghost min-h-13">
            Go to my journey
          </Link>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">
        {mode === "guest"
          ? "Create a free account to keep this report, retake in 30 days and see what moved."
          : "Retake in 30 days and see what moved."}
      </p>
    </section>
  );
}

function AreaCard({ score: s, rows, allRows, delay }: { score: AreaScore; rows: ReportRow[]; allRows: ReportRow[]; delay: number }) {
  const [open, setOpen] = useState(false);
  const pct = s.pct ?? 0;
  return (
    <motion.div {...reveal(delay)} style={areaStyle(s.color)} className="area-border overflow-hidden rounded-2xl border bg-surface">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full p-4 text-left sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-lg font-semibold">{rows[0]?.area?.emoji} {s.name}</p>
          <p className="text-sm tabular-nums">
            <span className="font-semibold">{fmt(s.score, 2)}</span>
            <span className="text-muted"> / {fmt(s.max, 1)}</span>
          </p>
        </div>
        <div className="area-tint-strong mt-3 h-2 overflow-hidden rounded-full">
          <motion.div
            className="area-fill h-full origin-left rounded-full"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: pct / 100 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: delay + 0.15, ease: EASE_OUT }}
          />
        </div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <p className="text-sm leading-relaxed text-muted">{areaReflection(s, allRows)}</p>
          <span className="shrink-0 text-sm text-muted">{open ? "Hide" : "Details"} {open ? "↑" : "↓"}</span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="border-t border-line"
          >
            {rows.map((r) => (
              <li key={r.question?.id ?? r.label} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:px-5">
                <span aria-hidden>{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{r.label}</p>
                  <p className="truncate text-sm text-muted">
                    {r.answerEmoji} {r.answerLabel}
                  </p>
                </div>
                <Dots fraction={r.fraction} na={r.na} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Dots({ fraction, na }: { fraction: number; na: boolean }) {
  if (na) return <span className="text-xs text-muted">n/a</span>;
  const filled = Math.round(fraction * 3);
  return (
    <span className="flex gap-1" aria-label={`${filled} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cx("size-2 rounded-full", i < filled ? "area-fill" : "area-tint-strong")} />
      ))}
    </span>
  );
}
