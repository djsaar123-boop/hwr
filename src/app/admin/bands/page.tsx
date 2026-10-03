"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBands } from "@/lib/bank";
import { createClient } from "@/lib/supabase/client";
import type { Band } from "@/lib/types";

type Draft = Omit<Band, "min_score"> & { min_score: string; _new?: boolean };

export default function BandsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const bands = await loadBands(supabase);
    setRows(bands.map((b) => ({ ...b, min_score: String(b.min_score) })));
    setRemoved([]);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <p className="text-muted">Loading…</p>;
  const set = (i: number, patch: Partial<Draft>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    const mins = rows.map((r) => Number(r.min_score));
    if (mins.some((m) => Number.isNaN(m) || m < 0 || m > 10)) return setMsg("Each band needs a minimum score between 0 and 10.");
    if (new Set(mins).size !== mins.length) return setMsg("Two bands can't share the same minimum score.");
    if (!mins.includes(0)) return setMsg("One band must start at 0 so every score has a label.");
    for (const id of removed) await supabase.from("score_bands").delete().eq("id", id);
    // Delete-then-upsert sidesteps the unique(min_score) constraint while values shift around.
    const existing = rows.filter((r) => !r._new).map((r) => r.id);
    if (existing.length) await supabase.from("score_bands").delete().in("id", existing);
    const { error } = await supabase.from("score_bands").insert(
      rows.map((r) => ({ id: r.id, min_score: Number(r.min_score), label: r.label, emoji: r.emoji || null, message: r.message || null })),
    );
    setMsg(error ? error.message : "Bands saved. New scorecards use these labels.");
    await load();
  };

  const sorted = [...rows].map((r, i) => ({ r, i })).sort((a, b) => Number(b.r.min_score) - Number(a.r.min_score));

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-muted">
        A score gets the band with the highest minimum it reaches. Existing scorecards keep the label they were given.
      </p>
      <div className="mt-5 grid gap-2">
        {sorted.map(({ r, i }) => (
          <div key={r.id} className="grid grid-cols-[72px_56px_1fr_auto] items-start gap-2 rounded-2xl border border-line bg-surface p-3">
            <label className="grid gap-1 text-xs text-muted">
              From
              <input className="field" type="number" step="0.1" min="0" max="10" value={r.min_score} onChange={(e) => set(i, { min_score: e.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Emoji
              <input className="field px-1 text-center" value={r.emoji ?? ""} onChange={(e) => set(i, { emoji: e.target.value })} />
            </label>
            <div className="grid gap-2">
              <label className="grid gap-1 text-xs text-muted">
                Label
                <input className="field" value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
              </label>
              <input className="field text-sm" placeholder="Message shown under the score" value={r.message ?? ""} onChange={(e) => set(i, { message: e.target.value })} />
            </div>
            <button
              className="mt-6 grid size-9 place-items-center rounded-full text-amber hover:bg-bg"
              aria-label="Remove band"
              onClick={() => {
                if (!r._new) setRemoved([...removed, r.id]);
                setRows(rows.filter((_, j) => j !== i));
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          className="btn btn-ghost"
          onClick={() => setRows([...rows, { id: crypto.randomUUID(), min_score: "", label: "", emoji: "", message: "", _new: true }])}
        >
          + Band
        </button>
        <button className="btn btn-primary" onClick={save}>
          Save bands
        </button>
      </div>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
