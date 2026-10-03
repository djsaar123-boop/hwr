"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import { stashGuestClaim } from "@/lib/claim";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ initialError, initialEmail }: { initialError: string | null; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(initialError);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    await stashGuestClaim(supabase);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else setStatus("sent");
  };

  if (status === "sent") {
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a sign-in link to ${email}. Open it on this device.`}>
        <button className="btn btn-ghost mt-2 w-full" onClick={() => setStatus("idle")}>
          Use a different email
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="We'll email you a one-tap sign-in link. No password needed.">
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Email
          <input
            className="field"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        {error && <p className="text-sm text-amber">{error}</p>}
        <button className="btn btn-primary mt-2" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/assess" className="font-medium text-ink underline underline-offset-4">
          Take the assessment first
        </Link>
      </p>
    </AuthShell>
  );
}
