"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Area, Option } from "@/lib/types";
import { EASE_OUT, SPRING, areaStyle, cx } from "@/lib/ui";

type Props = {
  area: Area;
  answers: Record<string, string>;
  onAnswer: (questionId: string, optionId: string) => void;
  onExit: () => void;
  onComplete: () => void;
};

type Phase = "list" | "question" | "done";

const HOLD_MS = 380; // let the person see what they picked before moving on

export default function AreaScreen({ area, answers, onAnswer, onExit, onComplete }: Props) {
  const reduce = useReducedMotion();
  const qs = area.questions;
  const firstOpen = qs.findIndex((q) => !answers[q.id]);

  const [phase, setPhase] = useState<Phase>("list");
  const [idx, setIdx] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [picked, setPicked] = useState<string | null>(null);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Beat 1 → Beat 2: show the whole map, then focus the first open question.
  useEffect(() => {
    if (phase !== "list") return;
    const t = setTimeout(() => setPhase("question"), reduce ? 700 : 250 + qs.length * 40 + 320 + 950);
    return () => clearTimeout(t);
  }, [phase, qs.length, reduce]);

  const q = qs[idx];
  const answeredHere = qs.filter((x) => answers[x.id]).length;

  const choose = (opt: Option) => {
    if (busy.current || phase !== "question") return;
    busy.current = true;
    setPicked(opt.id);
    onAnswer(q.id, opt.id);
    const merged = { ...answers, [q.id]: opt.id };
    later(
      () => {
        const next = [...qs.slice(idx + 1), ...qs.slice(0, idx)].find((x) => !merged[x.id]);
        setPicked(null);
        busy.current = false;
        if (next) setIdx(qs.indexOf(next));
        else {
          setPhase("done");
          later(onComplete, reduce ? 500 : 950);
        }
      },
      reduce ? 200 : HOLD_MS,
    );
  };

  const jump = (i: number) => {
    if (busy.current) return;
    setIdx(i);
    setPhase("question");
  };

  const back = () => {
    if (busy.current) return;
    if (phase === "question" && idx > 0) setIdx(idx - 1);
    else onExit();
  };

  // Keyboard: 1–4 answers, ← back, Esc to areas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (phase === "question" && /^[1-9]$/.test(e.key)) {
        const opt = q?.options[Number(e.key) - 1];
        if (opt) choose(opt);
      } else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <motion.div className="fixed inset-0 z-20 overflow-y-auto" style={areaStyle(area.color)} layoutScroll>
      <motion.div
        layoutId={`area-bg-${area.id}`}
        transition={SPRING}
        className="area-tint fixed inset-0"
        style={{ borderRadius: 0 }}
      />

      <motion.div
        className="relative mx-auto min-h-dvh max-w-5xl px-4 pt-5 pb-16 lg:px-8"
        exit={{ opacity: 0, transition: { duration: 0.18 } }}
      >
        <motion.header
          className="flex items-center justify-between gap-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.3 } }}
        >
          <button onClick={onExit} className="-ml-2 min-h-11 rounded-full px-2 text-sm font-medium text-muted hover:text-ink">
            ← All areas
          </button>
          <span className={cx("flex items-center gap-1.5 text-sm font-semibold transition-opacity", phase === "list" && "opacity-0")}>
            <span aria-hidden>{area.emoji}</span> {area.name}
          </span>
          <span className="min-w-14 text-right text-sm text-muted tabular-nums">
            {answeredHere}/{qs.length}
          </span>
        </motion.header>

        {phase === "list" ? (
          <ListBeat area={area} answers={answers} onJump={jump} />
        ) : (
          <div className="mt-4 lg:mt-10 lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-10">
            <Rail
              area={area}
              answers={answers}
              currentId={phase === "question" ? q.id : null}
              pulse={phase === "done"}
              onJump={jump}
            />
            <section className="mt-3 lg:mt-0">
              {phase === "question" && q && (
                <QuestionCard
                  key={q.id}
                  area={area}
                  index={idx}
                  answerId={picked ?? answers[q.id] ?? null}
                  onChoose={choose}
                  onBack={back}
                />
              )}
              {phase === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid place-items-center py-16 text-center"
                >
                  <span className="area-solid grid size-14 place-items-center rounded-full text-2xl">✓</span>
                  <p className="mt-4 font-serif text-2xl">{area.name} complete</p>
                </motion.div>
              )}
            </section>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {phase === "question" && q ? `Question ${idx + 1} of ${qs.length}: ${q.title}. ${q.prompt}` : ""}
          {phase === "done" ? `${area.name} complete.` : ""}
        </p>
      </motion.div>
    </motion.div>
  );
}

/** Beat 1 — every question of the area as a slim card, so the person sees the whole map first. */
function ListBeat({
  area,
  answers,
  onJump,
}: {
  area: Area;
  answers: Record<string, string>;
  onJump: (i: number) => void;
}) {
  return (
    <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
      <motion.div
        className="mb-6 lg:order-last lg:mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.4, ease: EASE_OUT } }}
      >
        <p className="text-4xl" aria-hidden>
          {area.emoji}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{area.title ?? area.name}</h1>
        {area.tagline && <p className="mt-2 max-w-md text-[15px] text-muted italic">“{area.tagline}”</p>}
        <p className="mt-4 text-sm text-muted">
          {area.questions.length} quick questions. There are no wrong answers — just honest ones.
        </p>
      </motion.div>
      <ol className="grid gap-2">
        {area.questions.map((q, i) => (
          <motion.li
            key={q.id}
            layoutId={`q-${q.id}`}
            transition={SPRING}
            style={{ borderRadius: 14 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.25 + i * 0.04, duration: 0.32, ease: EASE_OUT } }}
            className="area-border overflow-hidden border bg-surface/85"
          >
            <button onClick={() => onJump(i)} className="flex h-[52px] w-full items-center gap-3 px-4 text-left">
              <span aria-hidden className="text-lg">
                {q.emoji}
              </span>
              <span className="flex-1 font-medium">{q.short_label}</span>
              {answers[q.id] && <span className="area-ink text-sm">✓</span>}
            </button>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** The list, compressed: a horizontal chip rail on mobile, a side list on desktop. */
function Rail({
  area,
  answers,
  currentId,
  pulse,
  onJump,
}: {
  area: Area;
  answers: Record<string, string>;
  currentId: string | null;
  pulse: boolean;
  onJump: (i: number) => void;
}) {
  const currentRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentId]);

  return (
    <motion.nav
      layoutScroll
      aria-label={`${area.name} questions`}
      animate={pulse ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
    >
      {area.questions.map((q, i) => {
        const done = Boolean(answers[q.id]);
        if (q.id === currentId) {
          return (
            <span
              key={q.id}
              ref={currentRef}
              aria-current="step"
              className="area-solid flex h-10 shrink-0 items-center gap-2 rounded-[14px] px-3 text-sm font-semibold lg:h-12 lg:px-4"
            >
              <span aria-hidden>{q.emoji}</span>
              <span className="whitespace-nowrap">{q.short_label}</span>
            </span>
          );
        }
        return (
          <motion.button
            key={q.id}
            layoutId={`q-${q.id}`}
            transition={SPRING}
            style={{ borderRadius: 14 }}
            onClick={() => onJump(i)}
            aria-label={`${q.short_label}${done ? " (answered)" : ""}`}
            className={cx(
              "area-border flex h-10 shrink-0 items-center gap-2 overflow-hidden border px-3 text-sm lg:h-12 lg:px-4",
              done ? "bg-surface/90" : "bg-surface/50 text-muted",
            )}
          >
            <motion.span layout="position" className="flex items-center gap-2">
              <span aria-hidden>{q.emoji}</span>
              <span className="whitespace-nowrap">{q.short_label}</span>
              {done && <span className="area-ink">✓</span>}
            </motion.span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

function QuestionCard({
  area,
  index,
  answerId,
  onChoose,
  onBack,
}: {
  area: Area;
  index: number;
  answerId: string | null;
  onChoose: (o: Option) => void;
  onBack: () => void;
}) {
  const q = area.questions[index];
  const promptId = useId();

  return (
    <motion.article
      layoutId={`q-${q.id}`}
      transition={SPRING}
      style={{ borderRadius: 24 }}
      className="area-border overflow-hidden border bg-surface shadow-[0_1px_0_rgba(0,0,0,0.03)]"
    >
      <motion.div
        layout="position"
        className="p-5 sm:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.25 } }}
      >
        <p className="area-ink text-xs font-semibold tracking-wider uppercase">
          {area.name} · {index + 1} of {area.questions.length}
        </p>
        <h2 className="mt-2 flex items-center gap-2 text-[22px] leading-tight font-semibold sm:text-2xl">
          <span aria-hidden>{q.emoji}</span>
          {q.title}
        </h2>
        {q.fact && (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            <span className="font-semibold">Did you know? </span>
            {q.fact}
          </p>
        )}
        <p id={promptId} className="mt-5 text-[19px] leading-snug font-medium sm:text-[22px]">
          {q.prompt}
        </p>

        <div role="radiogroup" aria-labelledby={promptId} className="mt-5 grid gap-2.5">
          {q.options.map((o, i) => {
            const selected = answerId === o.id;
            return (
              <motion.button
                key={o.id}
                role="radio"
                aria-checked={selected}
                onClick={() => onChoose(o)}
                whileTap={{ scale: 0.985 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.16 + i * 0.04, duration: 0.25 } }}
                className={cx(
                  "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors duration-150",
                  selected ? "area-solid border-transparent" : "area-border hover:area-tint bg-bg/60",
                )}
              >
                <span aria-hidden className="text-2xl">
                  {o.emoji}
                </span>
                <span className="flex-1 text-[15px] leading-snug">{o.label}</span>
                {selected ? (
                  <span aria-hidden className="text-lg">
                    ✓
                  </span>
                ) : (
                  <kbd className="hidden rounded-md border border-line px-1.5 text-xs text-muted sm:inline">{i + 1}</kbd>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-muted">
          <button onClick={onBack} className="-ml-2 min-h-11 rounded-full px-2 hover:text-ink">
            ← {index > 0 ? "Previous" : "All areas"}
          </button>
          <span className="hidden sm:inline">Press 1–{q.options.length} to answer</span>
        </div>
      </motion.div>
    </motion.article>
  );
}
