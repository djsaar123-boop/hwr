import type { SupabaseClient } from "@supabase/supabase-js";
import type { Area, Band, CoachSettings } from "./types";

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

/** Areas → questions → options, sorted. `activeOnly` hides archived rows (admins can see them via RLS). */
export async function loadBank(supabase: SupabaseClient, { activeOnly = true } = {}): Promise<Area[]> {
  const { data, error } = await supabase.from("areas").select("*, questions(*, options(*))");
  if (error) throw new Error(`Couldn't load the question bank: ${error.message}`);

  return ((data ?? []) as Area[])
    .filter((a) => !activeOnly || a.is_active)
    .sort(bySort)
    .map((a) => ({
      ...a,
      questions: (a.questions ?? [])
        .filter((q) => !activeOnly || q.is_active)
        .sort(bySort)
        .map((q) => ({
          ...q,
          options: (q.options ?? []).filter((o) => !activeOnly || o.is_active).sort(bySort),
        })),
    }))
    .filter((a) => !activeOnly || a.questions.length > 0);
}

export async function loadBands(supabase: SupabaseClient): Promise<Band[]> {
  const { data } = await supabase.from("score_bands").select("*").order("min_score", { ascending: false });
  return (data ?? []) as Band[];
}

export async function loadCoach(supabase: SupabaseClient): Promise<CoachSettings> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "coach_whatsapp").maybeSingle();
  const v = (data?.value ?? {}) as Partial<CoachSettings>;
  return { number: v.number ?? "", message: v.message ?? "" };
}
