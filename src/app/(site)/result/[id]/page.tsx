import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Scorecard, { type ViewerMode } from "@/components/Scorecard";
import { loadBands, loadBank, loadCoach } from "@/lib/bank";
import { buildRows, whatsappUrl } from "@/lib/report";
import { getViewer } from "@/lib/supabase/server";
import type { Answer, Assessment } from "@/lib/types";

export const metadata: Metadata = { title: "Your scorecard — HWR" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  const { data: assessment } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle<Assessment>();
  if (!assessment) notFound();
  if (assessment.status !== "completed") redirect("/assess");

  const [{ data: answers }, areas, bands, coach] = await Promise.all([
    supabase
      .from("assessment_answers")
      .select("question_id, option_id, area_id, weight, score_fraction, points")
      .eq("assessment_id", id),
    loadBank(supabase, { activeOnly: false }),
    loadBands(supabase),
    loadCoach(supabase),
  ]);

  const rows = buildRows((answers ?? []) as Answer[], areas);
  const band = bands.find((b) => b.label === assessment.band_label);
  const mode: ViewerMode = assessment.user_id !== user.id ? "viewer" : user.is_anonymous ? "guest" : "member";

  return (
    <Scorecard
      assessment={assessment}
      rows={rows}
      bandMessage={band?.message ?? null}
      whatsappHref={whatsappUrl(coach, assessment)}
      mode={mode}
    />
  );
}
