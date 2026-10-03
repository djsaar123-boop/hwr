import type { Metadata } from "next";
import Link from "next/link";
import AssessmentFlow from "@/components/assess/AssessmentFlow";
import { loadBank } from "@/lib/bank";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Assessment — HWR" };

export default async function AssessPage() {
  const supabase = await createClient();
  const areas = await loadBank(supabase);

  if (!areas.length) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="font-serif text-2xl">The assessment isn&apos;t set up yet.</p>
          <p className="mt-2 text-muted">Add areas and questions from the admin panel.</p>
          <Link href="/" className="btn btn-ghost mt-6">
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return <AssessmentFlow areas={areas} />;
}
