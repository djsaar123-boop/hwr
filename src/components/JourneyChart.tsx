"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Assessment } from "@/lib/types";
import { areaStyle, cx } from "@/lib/ui";

type Point = Record<string, number | string | null>;

/** Overall score over time (thick) + each area as a thin line, all on the same 0–10 scale. */
export default function JourneyChart({ assessments }: { assessments: Assessment[] }) {
  const areaMeta = new Map<string, { slug: string; name: string; color: string }>();
  assessments.forEach((a) => (a.area_scores ?? []).forEach((s) => areaMeta.set(s.slug, { slug: s.slug, name: s.name, color: s.color })));
  const areas = [...areaMeta.values()];
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const data: Point[] = assessments.map((a) => {
    const p: Point = {
      date: new Date(a.completed_at ?? a.started_at).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      overall: a.total_score,
    };
    (a.area_scores ?? []).forEach((s) => (p[s.slug] = s.max > 0 && s.pct != null ? s.pct / 10 : null));
    return p;
  });

  const names: Record<string, string> = { overall: "Overall", ...Object.fromEntries(areas.map((a) => [a.slug, a.name])) };

  return (
    <div className="mt-4">
      <div className="relative h-[240px] text-ink">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fillOpacity: 0.6, fontSize: 12 }} padding={{ left: 16, right: 16 }} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} tick={{ fill: "currentColor", fillOpacity: 0.6, fontSize: 12 }} />
            <Tooltip
              formatter={(v, k) => [`${Number(v).toFixed(1)} / 10`, names[String(k)] ?? String(k)]}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            {areas.map(
              (a) =>
                shown[a.slug] && (
                  <Line key={a.slug} type="linear" dataKey={a.slug} stroke={a.color} strokeWidth={1.75} dot={{ r: 3, fill: a.color }} connectNulls isAnimationActive={false} />
                ),
            )}
            <Line type="linear" dataKey="overall" stroke="currentColor" strokeWidth={3} dot={{ r: 5, fill: "currentColor" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
        {assessments.length === 1 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-10 text-center text-sm text-muted">
            Your next check-in draws your first trend line.
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
          <span className="h-[3px] w-4 rounded bg-ink" /> Overall
        </span>
        {areas.map((a) => (
          <button
            key={a.slug}
            style={areaStyle(a.color)}
            onClick={() => setShown((s) => ({ ...s, [a.slug]: !s[a.slug] }))}
            aria-pressed={Boolean(shown[a.slug])}
            className={cx("flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors", shown[a.slug] ? "area-border area-tint" : "border-line text-muted")}
          >
            <span className="area-fill h-[2px] w-4 rounded" /> {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}
