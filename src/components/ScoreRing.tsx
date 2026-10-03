"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { AreaScore } from "@/lib/types";
import { EASE_OUT, areaStyle } from "@/lib/ui";

/**
 * One ring, one arc per area. Arc LENGTH = the area's share of total points (its weight);
 * arc FILL = how much of that area was earned. Total, per-area and weighting in a single glance.
 */
export default function ScoreRing({
  areas,
  score,
  band,
  size = 240,
  animated = true,
}: {
  areas: AreaScore[];
  score: number | null;
  band?: string | null;
  size?: number;
  animated?: boolean;
}) {
  const reduce = useReducedMotion();
  const instant = !animated || reduce;
  const [display, setDisplay] = useState(instant ? (score ?? 0) : 0);

  useEffect(() => {
    if (instant || score == null) return;
    const c = animate(0, score, {
      duration: 1.6,
      delay: 0.2,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(v),
    });
    return () => c.stop();
  }, [score, instant]);

  const scored = areas.filter((a) => a.max > 0);
  const totalMax = scored.reduce((n, a) => n + Number(a.max), 0) || 1;
  const GAP = scored.length > 1 ? 0.014 : 0;
  const shares = scored.map((a) => Number(a.max) / totalMax);
  const segments = scored.map((a, i) => ({
    a,
    i,
    start: shares.slice(0, i).reduce((n, s) => n + s, 0),
    len: Math.max(shares[i] - GAP, 0.001),
    pct: (a.pct ?? 0) / 100,
  }));

  const small = size < 160;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="size-full" role="img" aria-label={`Overall ${score ?? "—"} out of 10`}>
        {segments.map(({ a, i, start, len, pct }) => (
          <g key={a.area_id} transform={`rotate(${(start + GAP / 2) * 360 - 90} 100 100)`} style={areaStyle(a.color)}>
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              strokeWidth={small ? 16 : 13}
              pathLength={1}
              strokeDasharray={`${len} 1`}
              style={{ stroke: "color-mix(in srgb, var(--area) 20%, var(--bg))" }}
            />
            <motion.circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              strokeWidth={small ? 16 : 13}
              style={{ stroke: "var(--area)" }}
              initial={{ pathLength: instant ? len * pct : 0 }}
              animate={{ pathLength: len * pct }}
              transition={{ delay: instant ? 0 : 0.25 + i * 0.35, duration: instant ? 0 : 0.9, ease: EASE_OUT }}
            />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className={small ? "font-serif text-2xl leading-none" : "font-serif text-[56px] leading-none font-medium"}>
            {score == null ? "—" : display.toFixed(1)}
          </p>
          {!small && <p className="mt-1 text-sm text-muted">out of 10</p>}
          {band && !small && (
            <motion.p
              className="mt-2 text-[15px] font-semibold"
              initial={instant ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: instant ? 0 : 1.5, duration: 0.4 }}
            >
              {band}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
