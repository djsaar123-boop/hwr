"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadBank } from "@/lib/bank";
import { createClient } from "@/lib/supabase/client";
import type { Area, Option, Question } from "@/lib/types";
import { areaStyle, cx } from "@/lib/ui";

const TIERS = [1, 0.667, 0.333, 0];
const FK_VIOLATION = "23503";

type Flash = { kind: "ok" | "err"; text: string } | null;

export default function QuestionBankEditor() {
  const supabase = useMemo(() => createClient(), []);
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  const reload = useCallback(async () => {
    const bank = await loadBank(supabase, { activeOnly: false });
    setAreas(bank);
    setAreaId((cur) => (cur && bank.some((a) => a.id === cur) ? cur : (bank[0]?.id ?? null)));
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    reload().catch((e) => setFlash({ kind: "err", text: e.message }));
  }, [reload]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const ok = (text: string) => setFlash({ kind: "ok", text });
  const fail = (text: string) => setFlash({ kind: "err", text });

  if (!areas) return <p className="text-muted">Loading…</p>;
  const area = areas.find((a) => a.id === areaId) ?? null;

  const activeWeight = (a: Area) => a.questions.filter((q) => q.is_active).reduce((n, q) => n + Number(q.weight), 0);
  const total = areas.filter((a) => a.is_active).reduce((n, a) => n + activeWeight(a), 0);

  const addArea = async () => {
    const sort = Math.max(0, ...areas.map((a) => a.sort_order)) + 1;
    const { data, error } = await supabase
      .from("areas")
      .insert({ slug: `area-${Date.now().toString(36)}`, name: "New area", emoji: "✨", color: "#7a8cc4", sort_order: sort })
      .select("id")
      .single();
    if (error) return fail(error.message);
    await reload();
    setAreaId(data.id);
    ok("Area added");
  };

  const swap = async (table: "areas" | "questions", a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) => {
    const r1 = await supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id);
    const r2 = await supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id);
    if (r1.error || r2.error) fail((r1.error ?? r2.error)!.message);
    await reload();
  };

  const addQuestion = async (a: Area) => {
    const sort = Math.max(0, ...a.questions.map((q) => q.sort_order)) + 1;
    const { data, error } = await supabase
      .from("questions")
      .insert({ area_id: a.id, title: "New question", short_label: "New", prompt: "Your question?", weight: 0.3, sort_order: sort, emoji: "✨" })
      .select("id")
      .single();
    if (error) return fail(error.message);
    const opts = TIERS.map((f, i) => ({ question_id: data.id, label: `Option ${i + 1}`, score_fraction: f, sort_order: i + 1 }));
    const res = await supabase.from("options").insert(opts);
    if (res.error) fail(res.error.message);
    await reload();
    setOpenQ(data.id);
    ok("Question added — fill it in and save");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAreaId(a.id)}
            style={areaStyle(a.color)}
            className={cx(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
              a.id === areaId ? "area-solid border-transparent font-semibold" : "area-border bg-surface",
              !a.is_active && "opacity-60",
            )}
          >
            {a.emoji} {a.name}
            <span className={cx("text-xs", a.id === areaId ? "text-white/80" : "text-muted")}>{activeWeight(a).toFixed(1)} pts</span>
          </button>
        ))}
        <button onClick={addArea} className="rounded-full border border-dashed border-line px-4 py-2 text-sm text-muted hover:text-ink">
          + Area
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">
        Total across active areas: <b className="text-ink">{total.toFixed(2)} pts</b>. Scores are normalised to 10, so the total
        doesn&apos;t have to be exactly 10 — but each area&apos;s share of the ring follows these weights.
      </p>

      {area && (
        <>
          <AreaForm
            key={area.id}
            area={area}
            canLeft={areas.indexOf(area) > 0}
            canRight={areas.indexOf(area) < areas.length - 1}
            onMove={(d) => swap("areas", area, areas[areas.indexOf(area) + d])}
            onSaved={async (msg) => (await reload(), ok(msg))}
            onError={fail}
          />

          <div className="mt-8 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Questions</h2>
            <span className="text-sm text-muted">
              {area.questions.filter((q) => q.is_active).length} active · {activeWeight(area).toFixed(2)} pts
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {area.questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                question={q}
                open={openQ === q.id}
                onToggle={() => setOpenQ(openQ === q.id ? null : q.id)}
                canUp={i > 0}
                canDown={i < area.questions.length - 1}
                onMove={(d) => swap("questions", q, area.questions[i + d])}
                onSaved={async (msg) => (await reload(), ok(msg))}
                onError={fail}
              />
            ))}
          </div>
          <button onClick={() => addQuestion(area)} className="btn btn-ghost mt-4">
            + Add question
          </button>
        </>
      )}

      {flash && (
        <div
          role="status"
          className={cx(
            "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border px-4 py-3 text-sm shadow-lg",
            flash.kind === "ok" ? "border-line bg-surface" : "border-amber/40 bg-surface text-amber",
          )}
        >
          {flash.text}
        </div>
      )}
    </div>
  );
}

function AreaForm({
  area,
  canLeft,
  canRight,
  onMove,
  onSaved,
  onError,
}: {
  area: Area;
  canLeft: boolean;
  canRight: boolean;
  onMove: (d: -1 | 1) => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const supabase = createClient();
  const [d, setD] = useState({
    name: area.name,
    title: area.title ?? "",
    emoji: area.emoji ?? "",
    tagline: area.tagline ?? "",
    color: area.color,
    slug: area.slug,
    is_active: area.is_active,
  });
  const set = (k: keyof typeof d, v: string | boolean) => setD({ ...d, [k]: v });

  const save = async () => {
    const { error } = await supabase
      .from("areas")
      .update({ ...d, title: d.title || null, tagline: d.tagline || null, updated_at: new Date().toISOString() })
      .eq("id", area.id);
    if (error) onError(error.message);
    else onSaved("Area saved");
  };

  const remove = async () => {
    if (!confirm(`Delete “${area.name}”? Areas with questions are archived instead.`)) return;
    const { error } = await supabase.from("areas").delete().eq("id", area.id);
    if (!error) return onSaved("Area deleted");
    if (error.code !== FK_VIOLATION) return onError(error.message);
    const res = await supabase.from("areas").update({ is_active: false }).eq("id", area.id);
    if (res.error) onError(res.error.message);
    else onSaved("Area has questions, so it was archived (hidden from the assessment)");
  };

  return (
    <section className="mt-6 rounded-3xl border border-line bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-[80px_1fr_1fr]">
        <Field label="Emoji">
          <input className="field text-center text-xl" value={d.emoji} onChange={(e) => set("emoji", e.target.value)} />
        </Field>
        <Field label="Name (bubble)">
          <input className="field" value={d.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Title (area screen)">
          <input className="field" value={d.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_160px]">
        <Field label="Tagline">
          <input className="field" value={d.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Colour">
          <input className="field h-[46px] p-1" type="color" value={d.color} onChange={(e) => set("color", e.target.value)} />
        </Field>
        <Field label="Slug (used in WhatsApp {slug})">
          <input className="field font-mono text-sm" value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={d.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active
        </label>
        <span className="flex-1" />
        <button className="btn btn-ghost" disabled={!canLeft} onClick={() => onMove(-1)} aria-label="Move area left">
          ←
        </button>
        <button className="btn btn-ghost" disabled={!canRight} onClick={() => onMove(1)} aria-label="Move area right">
          →
        </button>
        <button className="btn btn-ghost text-amber" onClick={remove}>
          Delete
        </button>
        <button className="btn btn-primary" onClick={save}>
          Save area
        </button>
      </div>
    </section>
  );
}

type OptionDraft = Option & { _new?: boolean };

function QuestionEditor({
  question: q,
  open,
  onToggle,
  canUp,
  canDown,
  onMove,
  onSaved,
  onError,
}: {
  question: Question;
  open: boolean;
  onToggle: () => void;
  canUp: boolean;
  canDown: boolean;
  onMove: (d: -1 | 1) => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const supabase = createClient();
  const [d, setD] = useState({
    title: q.title,
    short_label: q.short_label,
    emoji: q.emoji ?? "",
    fact: q.fact ?? "",
    prompt: q.prompt,
    tip: q.tip ?? "",
    weight: String(q.weight),
    is_active: q.is_active,
  });
  const [opts, setOpts] = useState<OptionDraft[]>(q.options);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof d, v: string | boolean) => setD({ ...d, [k]: v });
  const setOpt = (i: number, patch: Partial<Option>) => setOpts(opts.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const moveOpt = (i: number, dir: -1 | 1) => {
    const next = [...opts];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setOpts(next);
  };

  const save = async () => {
    const weight = Number(d.weight);
    if (!(weight > 0)) return onError("Weight must be greater than 0");
    if (opts.filter((o) => o.is_active).length < 2) return onError("A question needs at least 2 options");
    setSaving(true);
    const qRes = await supabase
      .from("questions")
      .update({ ...d, weight, emoji: d.emoji || null, fact: d.fact || null, tip: d.tip || null, updated_at: new Date().toISOString() })
      .eq("id", q.id);
    if (qRes.error) {
      setSaving(false);
      return onError(qRes.error.message);
    }

    const rows = opts.map((o, i) => ({
      id: o.id,
      question_id: q.id,
      label: o.label,
      emoji: o.emoji || null,
      score_fraction: Math.min(1, Math.max(0, Number(o.score_fraction))),
      is_na: o.is_na,
      is_active: o.is_active,
      sort_order: i + 1,
    }));
    const oRes = await supabase.from("options").upsert(rows);
    let archived = 0;
    for (const id of removed) {
      const del = await supabase.from("options").delete().eq("id", id);
      if (del.error?.code === FK_VIOLATION) {
        await supabase.from("options").update({ is_active: false }).eq("id", id);
        archived++;
      }
    }
    setSaving(false);
    setRemoved([]);
    if (oRes.error) return onError(oRes.error.message);
    setOpts(opts.map((o) => ({ ...o, _new: false })));
    onSaved(archived ? `Saved. ${archived} option(s) had answers, so they were archived instead of deleted.` : "Question saved");
  };

  const remove = async () => {
    if (!confirm(`Delete “${q.title}”? If people have answered it, it will be archived instead.`)) return;
    const { error } = await supabase.from("questions").delete().eq("id", q.id);
    if (!error) return onSaved("Question deleted");
    if (error.code !== FK_VIOLATION) return onError(error.message);
    const res = await supabase.from("questions").update({ is_active: false }).eq("id", q.id);
    if (res.error) onError(res.error.message);
    else onSaved("Question has answers, so it was archived (hidden from new assessments)");
  };

  return (
    <div className={cx("overflow-hidden rounded-2xl border border-line bg-surface", !q.is_active && "opacity-60")}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={onToggle} className="flex min-h-11 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <span aria-hidden>{q.emoji}</span>
          <span className="font-medium">{q.short_label}</span>
          <span className="hidden truncate text-sm text-muted sm:inline">{q.title}</span>
          {!q.is_active && <span className="rounded-full bg-line px-2 py-0.5 text-xs">archived</span>}
        </button>
        <span className="text-sm text-muted tabular-nums">{Number(q.weight).toFixed(2)}</span>
        <button className="grid size-9 place-items-center rounded-full text-muted hover:bg-bg disabled:opacity-30" disabled={!canUp} onClick={() => onMove(-1)} aria-label="Move up">
          ↑
        </button>
        <button className="grid size-9 place-items-center rounded-full text-muted hover:bg-bg disabled:opacity-30" disabled={!canDown} onClick={() => onMove(1)} aria-label="Move down">
          ↓
        </button>
      </div>

      {open && (
        <div className="border-t border-line p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[80px_1fr_1fr_110px]">
            <Field label="Emoji">
              <input className="field text-center text-xl" value={d.emoji} onChange={(e) => set("emoji", e.target.value)} />
            </Field>
            <Field label="Title">
              <input className="field" value={d.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Short label (cards, scorecard)">
              <input className="field" value={d.short_label} onChange={(e) => set("short_label", e.target.value)} />
            </Field>
            <Field label="Weight (pts)">
              <input className="field" type="number" step="0.05" min="0.05" value={d.weight} onChange={(e) => set("weight", e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Question">
              <input className="field" value={d.prompt} onChange={(e) => set("prompt", e.target.value)} />
            </Field>
            <Field label="“Did you know?” fact">
              <textarea className="field min-h-16" value={d.fact} onChange={(e) => set("fact", e.target.value)} />
            </Field>
            <Field label="Growth tip (shown when this is a top growth area)">
              <textarea className="field min-h-16" value={d.tip} onChange={(e) => set("tip", e.target.value)} />
            </Field>
          </div>

          <p className="mt-5 text-sm font-semibold">Answer options</p>
          <p className="text-xs text-muted">
            Score = share of the weight earned (1 = full points, 0 = none). “N/A” removes the question from the score entirely.
          </p>
          <div className="mt-3 grid gap-2">
            {opts.map((o, i) => (
              <div key={o.id} className={cx("grid grid-cols-[52px_1fr] gap-2 rounded-xl border border-line p-2 sm:grid-cols-[52px_1fr_96px_auto]", !o.is_active && "opacity-60")}>
                <input className="field px-1 text-center text-lg" value={o.emoji ?? ""} onChange={(e) => setOpt(i, { emoji: e.target.value })} aria-label="Option emoji" />
                <input className="field" value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} aria-label="Option label" />
                <input
                  className="field col-span-1"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  disabled={o.is_na}
                  value={o.is_na ? 0 : o.score_fraction}
                  onChange={(e) => setOpt(i, { score_fraction: Number(e.target.value) })}
                  aria-label="Score fraction"
                />
                <div className="flex items-center gap-1 text-sm">
                  <label className="flex items-center gap-1 px-1 whitespace-nowrap">
                    <input type="checkbox" checked={o.is_na} onChange={(e) => setOpt(i, { is_na: e.target.checked, score_fraction: 0 })} /> N/A
                  </label>
                  {!o.is_active && (
                    <button className="px-1 text-xs underline" onClick={() => setOpt(i, { is_active: true })}>
                      restore
                    </button>
                  )}
                  <button className="grid size-8 place-items-center rounded-full hover:bg-bg disabled:opacity-30" disabled={i === 0} onClick={() => moveOpt(i, -1)} aria-label="Move option up">
                    ↑
                  </button>
                  <button className="grid size-8 place-items-center rounded-full hover:bg-bg disabled:opacity-30" disabled={i === opts.length - 1} onClick={() => moveOpt(i, 1)} aria-label="Move option down">
                    ↓
                  </button>
                  <button
                    className="grid size-8 place-items-center rounded-full text-amber hover:bg-bg"
                    onClick={() => {
                      if (!o._new) setRemoved([...removed, o.id]);
                      setOpts(opts.filter((_, j) => j !== i));
                    }}
                    aria-label="Remove option"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-2 text-sm text-muted underline underline-offset-4 hover:text-ink"
            onClick={() =>
              setOpts([
                ...opts,
                { id: crypto.randomUUID(), question_id: q.id, label: "", emoji: "", score_fraction: 0, sort_order: opts.length + 1, is_active: true, is_na: false, _new: true },
              ])
            }
          >
            + Add option
          </button>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active
            </label>
            <span className="flex-1" />
            <button className="btn btn-ghost text-amber" onClick={remove}>
              Delete
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted">
      {label}
      {children}
    </label>
  );
}
