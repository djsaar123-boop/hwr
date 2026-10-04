"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import JourneyChart from "@/components/JourneyChart";
import ScoreRing from "@/components/ScoreRing";
import { redeemGuestClaim } from "@/lib/claim";
import { fmt } from "@/lib/report";
import { createClient } from "@/lib/supabase/client";
import type { Assessment, Profile } from "@/lib/types";

const RETAKE_DAYS = 30;
const DAY = 86_400_000;

export default function Dashboard({ profile, email, assessments }: { profile: Profile | null; email: string; assessments: Assessment[] }) {
  const router = useRouter();
  const [merged, setMerged] = useState(0);

  // A guest who logged into an existing account: bring their results over.
  useEffect(() => {
    redeemGuestClaim(createClient()).then((n) => {
      if (n > 0) {
        setMerged(n);
        router.refresh();
      }
    });
  }, [router]);

  const latest = assessments.at(-1);
  const firstName = profile?.full_name?.split(" ")[0];
  // eslint-disable-next-line react-hooks/purity -- "days since" is meant to be read at render time
  const now = Date.now();
  const daysSince = latest?.completed_at ? Math.floor((now - new Date(latest.completed_at).getTime()) / DAY) : null;
  const daysLeft = daysSince == null ? null : RETAKE_DAYS - daysSince;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 lg:px-8">
      <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{firstName ? `Hi, ${firstName}` : "Your journey"}</h1>
      {merged > 0 && (
        <p className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          ✓ We added your latest result to this account.
        </p>
      )}

      {!latest ? (
        <section className="mt-8 rounded-3xl border border-line bg-surface p-8 text-center">
          <p className="font-serif text-2xl">No check-ins yet</p>
          <p className="mt-2 text-muted">Take your first assessment to start your journey graph.</p>
          <Link href="/assess" className="btn btn-primary mt-6">
            Start the assessment
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-3xl border border-line bg-surface p-6 text-center">
              <p className="text-sm text-muted">Latest check-in</p>
              <div className="mt-4">
                <ScoreRing areas={latest.area_scores ?? []} score={latest.total_score} size={200} animated={false} />
              </div>
              <p className="mt-4 font-semibold">
                {latest.band_emoji} {latest.band_label}
              </p>
              <div className="mt-5 grid gap-2">
                <Link href="/assess" className="btn btn-primary">
                  Retake assessment
                </Link>
                <Link href={`/result/${latest.id}`} className="btn btn-ghost">
                  View full report
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted">
                {daysLeft != null && daysLeft > 0
                  ? `Next check-in suggested in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                  : "It's a good time for a fresh check-in"}
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-2xl">Your journey</h2>
                <p className="text-sm text-muted">score out of 10</p>
              </div>
              <JourneyChart assessments={assessments} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl">History</h2>
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {[...assessments].reverse().map((a) => (
                <li key={a.id}>
                  <Link href={`/result/${a.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-bg/60">
                    <span className="w-14 font-serif text-xl tabular-nums">{fmt(a.total_score)}</span>
                    <span className="flex-1">
                      <span className="font-medium">
                        {a.band_emoji} {a.band_label}
                      </span>
                      <span className="block text-sm text-muted">
                        {new Date(a.completed_at ?? a.started_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </span>
                    <span className="text-muted" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <ProfileForm profile={profile} email={email} hasHistory={assessments.length > 0} />
    </main>
  );
}

function PasswordForm() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg("Use at least 8 characters.");
    const { error } = await createClient().auth.updateUser({ password: pw });
    setMsg(error ? error.message : "Password saved ✓ — you can now log in with email + password.");
    if (!error) setPw("");
  };

  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl border border-line bg-surface p-5">
      <label className="grid gap-1.5 text-sm font-medium">
        Set or change password
        <input className="field" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => (setPw(e.target.value), setMsg(null))} />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost">Save password</button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </form>
  );
}

function ProfileForm({ profile, email, hasHistory }: { profile: Profile | null; email: string; hasHistory: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await createClient().from("profiles").update({ full_name: name || null, phone: phone || null }).eq("id", profile.id);
    setSaved(true);
    router.refresh();
  };

  const deleteHistory = async () => {
    if (!profile || !confirm("Delete all your assessment results? This can't be undone.")) return;
    await createClient().from("assessments").delete().eq("user_id", profile.id);
    router.refresh();
  };

  return (
    <section className="mt-12 max-w-xl">
      <h2 className="font-serif text-2xl">Profile</h2>
      <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">{email}</p>
        <label className="grid gap-1.5 text-sm font-medium">
          Name
          <input className="field" value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Phone
          <input className="field" type="tel" value={phone} onChange={(e) => (setPhone(e.target.value), setSaved(false))} />
        </label>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary">Save</button>
          {saved && <span className="text-sm text-muted">Saved ✓</span>}
        </div>
      </form>
      <PasswordForm />
      {hasHistory && (
        <button onClick={deleteHistory} className="mt-4 text-sm text-muted underline underline-offset-4 hover:text-amber">
          Delete my assessment history
        </button>
      )}
    </section>
  );
}
