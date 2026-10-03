"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm({ isGuest }: { isGuest: boolean }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    setExists(false);

    const supabase = createClient();
    const email = form.email.trim();
    const meta = { full_name: form.full_name.trim(), phone: form.phone.trim() };
    const emailRedirectTo = `${location.origin}/auth/callback?next=/dashboard`;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let err;
    if (user?.is_anonymous) {
      // Upgrade the guest in place — their assessment is already theirs, nothing to migrate.
      await supabase.from("profiles").update({ full_name: meta.full_name || null, phone: meta.phone || null }).eq("id", user.id);
      ({ error: err } = await supabase.auth.updateUser({ email, data: meta }, { emailRedirectTo }));
    } else {
      ({ error: err } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, data: meta } }));
    }

    if (err) {
      const taken = err.code === "email_exists" || /already|registered/i.test(err.message);
      setExists(taken);
      setError(taken ? "That email already has an account." : err.message);
      setStatus("idle");
    } else setStatus("sent");
  };

  if (status === "sent") {
    return (
      <AuthShell title="One last tap" subtitle={`We sent a confirmation link to ${form.email}. Open it on this device to finish.`}>
        <p className="text-sm text-muted">Didn&apos;t get it? Check spam, or</p>
        <button className="btn btn-ghost mt-3 w-full" onClick={() => setStatus("idle")}>
          Try again
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Save your results"
      subtitle={
        isGuest
          ? "Your scorecard is kept, and every retake adds a point to your journey graph."
          : "Create a free account to track your wellbeing over time."
      }
    >
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Your name
          <input className="field" required autoComplete="name" value={form.full_name} onChange={set("full_name")} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Email
          <input className="field" type="email" required autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          <span>
            Phone <span className="font-normal text-muted">(optional — so your coach can reach you)</span>
          </span>
          <input className="field" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
        </label>
        {error && (
          <p className="text-sm text-amber">
            {error}{" "}
            {exists && (
              <Link href={`/login?email=${encodeURIComponent(form.email)}`} className="font-semibold underline underline-offset-4">
                Log in instead — we&apos;ll add this result to it.
              </Link>
            )}
          </p>
        )}
        <button className="btn btn-primary mt-2" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Create my account"}
        </button>
        <p className="text-xs leading-relaxed text-muted">
          We&apos;ll email you a link to confirm — no password needed. Your answers are private to you and your coach.
        </p>
      </form>
    </AuthShell>
  );
}
