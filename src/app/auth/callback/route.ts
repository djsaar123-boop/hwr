import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");

// Landing point for magic links and email confirmations (PKCE `code`, or `token_hash` templates).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const reason =
    url.searchParams.get("error_description") ??
    "That link has expired or was opened in a different browser. Request a new one below.";
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, url.origin));
}
