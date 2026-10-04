"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import GoogleButton from "@/components/GoogleButton";
import { stashGuestClaim } from "@/lib/claim";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm({ isGuest }: { isGuest: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "confirm">("idle");
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
    setStatus("sending");
    setError(null);
    setExists(false);

    const supabase = createClient();
    await stashGuestClaim(supabase); // carries the guest's scorecard into the new account
    const meta = { full_name: form.full_name.trim(), phone: form.phone.trim() };
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: meta, emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });

    if (err) {
      const taken = err.code === "user_already_exists" || /already|registered/i.test(err.message);
      setExists(taken);
      setError(taken ? "That email already has an account." : err.message);
      setStatus("idle");
    } else if (data.session && data.user) {
      await supabase.from("profiles").update({ full_name: meta.full_name || null, phone: meta.phone || null }).eq("id", data.user.id);
      router.replace("/dashboard");
      router.refresh();
    } else {
      setStatus("confirm"); // email confirmation is switched on in Supabase
    }
  };

  if (status === "confirm") {
    return (
      <AuthShell title="Confirm your email" subtitle={`We sent a confirmation link to ${form.email}. Open it on this device to finish.`}>
        <button className="btn btn-ghost w-full" onClick={() => setStatus("idle")}>
          Back
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Save your results"
      subtitle={isGuest ? "Your scorecard is kept, and every retake adds a point to your journey graph." : "Create a free account to track your wellbeing over time."}
    >
      <GoogleButton onError={setError} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
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
          Password
          <input className="field" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
          <span className="text-xs font-normal text-muted">At least 8 characters.</span>
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
          {status === "sending" ? "Creating…" : "Create my account"}
        </button>
        <p className="text-xs leading-relaxed text-muted">Your answers are private to you and your coach.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
