import type { SupabaseClient } from "@supabase/supabase-js";

const KEY = "hwr_claim";

/** Called by a guest before logging into an existing account, so their results can follow them. */
export async function stashGuestClaim(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.is_anonymous) return;
  const { data, error } = await supabase.rpc("create_assessment_claim");
  if (!error && data) {
    try {
      localStorage.setItem(KEY, String(data));
    } catch {}
  }
}

/** Called once signed in as a real account. Returns how many assessments moved over. */
export async function redeemGuestClaim(supabase: SupabaseClient) {
  let token: string | null = null;
  try {
    token = localStorage.getItem(KEY);
  } catch {}
  if (!token) return 0;
  const { data, error } = await supabase.rpc("redeem_assessment_claim", { p_token: token });
  if (!error) {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }
  return error ? 0 : Number(data ?? 0);
}
