"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/lib/report";
import { createClient } from "@/lib/supabase/client";
import type { Assessment, Profile } from "@/lib/types";

type Row = Assessment & { profile: Profile | null };

export default function SubmissionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [who, setWho] = useState<"all" | "members" | "guests">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("assessments")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1000);
      const list = (data ?? []) as Assessment[];
      const ids = [...new Set(list.map((a) => a.user_id))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, email, full_name, phone, role").in("id", ids)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
      setRows(list.map((a) => ({ ...a, profile: byId.get(a.user_id) ?? null })));
    })();
  }, [supabase]);

  const filtered = (rows ?? []).filter((r) => {
    const member = Boolean(r.profile?.email);
    if (who === "members" && !member) return false;
    if (who === "guests" && member) return false;
    const hay = `${r.profile?.full_name ?? ""} ${r.profile?.email ?? ""} ${r.profile?.phone ?? ""} ${r.band_label ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const areaNames = [...new Map((rows ?? []).flatMap((r) => (r.area_scores ?? []).map((s) => [s.slug, s.name] as const))).entries()];

  const exportCsv = () => {
    const head = ["completed_at", "name", "email", "phone", "score", "band", ...areaNames.map(([, n]) => `${n} %`)];
    const lines = filtered.map((r) => [
      r.completed_at ?? "",
      r.profile?.full_name ?? "",
      r.profile?.email ?? "guest",
      r.profile?.phone ?? "",
      fmt(r.total_score),
      r.band_label ?? "",
      ...areaNames.map(([slug]) => String(r.area_scores?.find((s) => s.slug === slug)?.pct ?? "")),
    ]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `hwr-submissions-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!rows) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input className="field max-w-xs" placeholder="Search name, email, phone, band" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field w-auto" value={who} onChange={(e) => setWho(e.target.value as typeof who)}>
          <option value="all">Everyone</option>
          <option value="members">Signed-up members</option>
          <option value="guests">Guests</option>
        </select>
        <span className="flex-1" />
        <span className="text-sm text-muted">{filtered.length} results</span>
        <button className="btn btn-ghost" onClick={exportCsv} disabled={!filtered.length}>
          Export CSV
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              {areaNames.map(([slug, name]) => (
                <th key={slug} className="px-4 py-3 font-semibold">
                  {name}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {new Date(r.completed_at ?? r.started_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  {r.profile?.email ? (
                    <>
                      <p className="font-medium">{r.profile.full_name || "—"}</p>
                      <p className="text-xs text-muted">
                        {r.profile.email}
                        {r.profile.phone ? ` · ${r.profile.phone}` : ""}
                      </p>
                    </>
                  ) : (
                    <span className="text-muted">Guest</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <b className="tabular-nums">{fmt(r.total_score)}</b> <span className="text-muted">{r.band_emoji} {r.band_label}</span>
                </td>
                {areaNames.map(([slug]) => (
                  <td key={slug} className="px-4 py-3 tabular-nums">
                    {r.area_scores?.find((s) => s.slug === slug)?.pct ?? "—"}%
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <Link href={`/result/${r.id}`} className="text-sm underline underline-offset-4">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="p-8 text-center text-muted">No submissions yet.</p>}
      </div>
    </div>
  );
}
