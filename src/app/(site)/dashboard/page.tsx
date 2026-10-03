import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";
import { getViewer } from "@/lib/supabase/server";
import type { Assessment } from "@/lib/types";

export const metadata: Metadata = { title: "My journey — HWR" };

export default async function DashboardPage() {
  const { supabase, user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (user.is_anonymous) redirect("/signup");

  const { data } = await supabase
    .from("assessments")
    .select("id, total_score, band_label, band_emoji, area_scores, completed_at, started_at, status, user_id, raw_points, max_points")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });

  return <Dashboard profile={profile} email={user.email ?? ""} assessments={(data ?? []) as Assessment[]} />;
}
