import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Save your results — HWR" };

export default async function SignupPage() {
  const { user } = await getViewer();
  if (user && !user.is_anonymous) redirect("/dashboard");
  return <SignupForm isGuest={Boolean(user?.is_anonymous)} />;
}
