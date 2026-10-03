"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCoach } from "@/lib/bank";
import { whatsappUrl } from "@/lib/report";
import { createClient } from "@/lib/supabase/client";
import type { CoachSettings } from "@/lib/types";

const SAMPLE = {
  total_score: 6.7,
  band_label: "Building Momentum",
  area_scores: [
    { area_id: "h", slug: "health", name: "Health", color: "", score: 2.05, max: 3, pct: 68 },
    { area_id: "w", slug: "wealth", name: "Wealth", color: "", score: 1.85, max: 3, pct: 62 },
    { area_id: "r", slug: "relationship", name: "Relationships", color: "", score: 2.78, max: 4, pct: 70 },
  ],
};

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [coach, setCoach] = useState<CoachSettings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCoach(supabase).then(setCoach);
  }, [supabase]);

  if (!coach) return <p className="text-muted">Loading…</p>;

  const digits = coach.number.replace(/\D/g, "");
  const valid = digits.length >= 8 && digits.length <= 15;
  const preview = decodeURIComponent(whatsappUrl(coach, SAMPLE).split("?text=")[1] ?? "");

  const save = async () => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "coach_whatsapp", value: { number: digits, message: coach.message }, updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "Saved ✓");
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-2xl">Coach on WhatsApp</h2>
      <div className="mt-4 grid gap-4 rounded-3xl border border-line bg-surface p-5">
        <label className="grid gap-1.5 text-sm font-medium">
          WhatsApp number
          <input
            className="field"
            inputMode="tel"
            value={coach.number}
            onChange={(e) => (setCoach({ ...coach, number: e.target.value }), setMsg(null))}
            placeholder="919876543210"
          />
          <span className={`text-xs font-normal ${valid ? "text-muted" : "text-amber"}`}>
            Country code + number, digits only (e.g. 91 for India). {valid ? `Opens wa.me/${digits}` : "Not a valid number yet — the button will open WhatsApp without a recipient."}
          </span>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Pre-filled message
          <textarea className="field min-h-28" value={coach.message} onChange={(e) => (setCoach({ ...coach, message: e.target.value }), setMsg(null))} />
          <span className="text-xs font-normal text-muted">
            Placeholders: <code>{"{score}"}</code> <code>{"{band}"}</code> <code>{"{areas}"}</code> and any area slug, e.g. <code>{"{health}"}</code>
          </span>
        </label>
        <div className="rounded-2xl bg-bg p-4 text-sm">
          <p className="text-xs font-semibold text-muted uppercase">Preview</p>
          <p className="mt-1 whitespace-pre-wrap">{preview}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
          {valid && (
            <a className="btn btn-ghost" href={whatsappUrl({ ...coach, number: digits }, SAMPLE)} target="_blank" rel="noopener noreferrer">
              Test link
            </a>
          )}
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
