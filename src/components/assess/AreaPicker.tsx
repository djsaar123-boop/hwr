"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import type { Area } from "@/lib/types";
import { EASE_OUT, SPRING, areaStyle, cx } from "@/lib/ui";

type Props = {
  areas: Area[];
  doneIds: Set<string>;
  resumed: boolean;
  allDone: boolean;
  canAutoLaunch: (areaId: string) => boolean;
  onPick: (areaId: string, auto?: boolean) => void;
  onFinish: () => void;
};

const AUTO_LAUNCH_MS = 1500;

export default function AreaPicker({ areas, doneIds, resumed, allDone, canAutoLaunch, onPick, onFinish }: Props) {
  const reduce = useReducedMotion();
  const remaining = areas.filter((a) => !doneIds.has(a.id));
  const startedSomething = doneIds.size > 0 || areas.length === 1;
  const lastOne = remaining.length === 1 && startedSomething && canAutoLaunch(remaining[0].id) ? remaining[0] : null;

  // When only one area is left, take the person there without asking for a click.
  useEffect(() => {
    if (!lastOne) return;
    const t = setTimeout(() => onPick(lastOne.id, true), reduce ? 900 : AUTO_LAUNCH_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOne?.id]);

  const totalQs = areas.reduce((n, a) => n + a.questions.length, 0);
  const heading = allDone
    ? "All three done. Ready for your scorecard?"
    : lastOne
      ? `Last one: ${lastOne.name}`
      : doneIds.size > 0
        ? "Lovely. Pick your next area."
        : resumed
          ? "Welcome back — pick up where you left off."
          : "Pick any area to start the assessment";
  const sub = allDone
    ? "Your answers are saved."
    : lastOne
      ? "Starting in a moment…"
      : `${areas.length} areas · ${totalQs} questions · about ${Math.max(1, Math.round((totalQs * 13) / 60))} minutes`;

  return (
    <motion.main
      className="relative mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center px-4 py-16"
      exit={{ opacity: 1 }}
    >
      <motion.header
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={heading}
            className="font-serif text-[28px] leading-tight font-medium text-balance sm:text-4xl"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            {heading}
          </motion.h1>
        </AnimatePresence>
        <p className="mt-2 text-sm text-muted">{sub}</p>
      </motion.header>

      <div className="mt-12 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-10">
        {areas.map((area, i) => (
          <Bubble
            key={area.id}
            area={area}
            index={i}
            done={doneIds.has(area.id)}
            featured={lastOne?.id === area.id}
            onPick={() => onPick(area.id)}
          />
        ))}
      </div>

      {allDone && (
        <motion.button
          className="btn btn-primary mt-12"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onClick={onFinish}
        >
          See my scorecard
        </motion.button>
      )}
      {lastOne && (
        <motion.button
          className="mt-10 text-sm text-muted underline underline-offset-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.3 } }}
          exit={{ opacity: 0 }}
          onClick={() => onPick(lastOne.id, true)}
        >
          Tap to start now
        </motion.button>
      )}
    </motion.main>
  );
}

function Bubble({
  area,
  index,
  done,
  featured,
  onPick,
}: {
  area: Area;
  index: number;
  done: boolean;
  featured: boolean;
  onPick: () => void;
}) {
  const reduce = useReducedMotion();
  const n = area.questions.length;
  const mins = Math.max(1, Math.round((n * 13) / 60));
  const dir = index % 2 === 0 ? 1 : -1;
  const drifting = !reduce && !done;

  const size = featured
    ? "size-[184px] sm:size-[220px]"
    : done
      ? "size-[116px] sm:size-[148px]"
      : "size-[150px] sm:size-[196px]";

  return (
    <motion.div
      layout
      transition={SPRING}
      className={cx(featured && "order-last flex basis-full justify-center", index === 1 && !featured && "sm:-translate-y-8")}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1, transition: { delay: 0.08 * index, duration: 0.45, ease: EASE_OUT } }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
    >
      <motion.div
        animate={drifting ? { x: [0, 7 * dir, -5 * dir, 0], y: [0, -9, 6, 0], rotate: [0, 1.4 * dir, -1 * dir, 0] } : {}}
        transition={{ duration: 8 + index * 1.7, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.button
          layout
          transition={SPRING}
          onClick={onPick}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={areaStyle(area.color)}
          aria-label={done ? `${area.name}: done. Tap to review your answers.` : `${area.name}: ${n} questions`}
          className={cx("relative grid cursor-pointer place-items-center rounded-full text-center", size)}
        >
          <motion.span
            layoutId={`area-bg-${area.id}`}
            transition={SPRING}
            className={cx("absolute inset-0", done ? "area-solid" : "area-tint-strong")}
            style={{ borderRadius: 9999 }}
          />
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/40 ring-inset" />
          <motion.span layout="position" className={cx("relative flex flex-col items-center px-3", done && "text-white")}>
            <span aria-hidden className={done ? "text-3xl" : featured ? "text-5xl" : "text-4xl sm:text-5xl"}>
              {area.emoji}
            </span>
            <span className={cx("mt-1 font-semibold", done ? "text-[15px]" : "text-[17px] sm:text-lg")}>{area.name}</span>
            <span className={cx("mt-0.5 text-xs", done ? "text-white/85" : "text-muted")}>
              {done ? "✓ Done" : `${n} questions · ~${mins} min`}
            </span>
          </motion.span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
