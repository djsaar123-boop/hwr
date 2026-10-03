import Link from "next/link";
import { loadBank } from "@/lib/bank";
import { fmt } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import type { AreaScore } from "@/lib/types";
import { areaStyle } from "@/lib/ui";

export default async function AdminOverview() {
  const supabase = await createClient();
  const [{ data: done }, { count: inProgress }, areas] = await Promise.all([
    supabase.from("assessments").select("total_score, area_scores, user_id").eq("status", "completed"),
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    loadBank(supabase),
  ]);

  const completed = done ?? [];
  const avg = completed.length ? completed.reduce((n, a) => n + Number(a.total_score ?? 0), 0) / completed.length : null;
  const people = new Set(completed.map((a) => a.user_id)).size;
  const started = completed.length + (inProgress ?? 0);
  const completion = started ? Math.round((completed.length / started) * 100) : null;

  const areaAvg = areas.map((area) => {
    const vals = completed
      .map((a) => (a.area_scores as AreaScore[] | null)?.find((s) => s.area_id === area.id)?.pct)
      .filter((v): v is number => v != null);
    return { area, pct: vals.length ? Math.round(vals.reduce((n, v) => n + v, 0) / vals.length) : null };
  });

  const stats = [
    { label: "Completed assessments", value: String(completed.length) },
    { label: "People", value: String(people) },
    { label: "Average score", value: avg == null ? "—" : `${fmt(avg)} / 10` },
    { label: "Completion rate", value: completion == null ? "—" : `${completion}%` },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 font-serif text-3xl">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-serif text-2xl">Average by area</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {areaAvg.map(({ area, pct }) => (
          <div key={area.id} style={areaStyle(area.color)} className="area-border rounded-2xl border bg-surface p-4">
            <p className="font-semibold">
              {area.emoji} {area.name}
            </p>
            <p className="mt-1 font-serif text-3xl">{pct == null ? "—" : `${pct}%`}</p>
            <div className="area-tint-strong mt-3 h-2 overflow-hidden rounded-full">
              <div className="area-fill h-full rounded-full" style={{ width: `${pct ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        Edit the question bank in{" "}
        <Link className="font-medium text-ink underline underline-offset-4" href="/admin/questions">
          Areas &amp; questions
        </Link>
        .
      </p>
    </div>
  );
}
