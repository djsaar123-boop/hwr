import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function SiteHeader() {
  const { user, profile } = await getViewer();
  const member = user && !user.is_anonymous;

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 lg:px-8">
      <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight">
        <span aria-hidden>🌿</span> HWR
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        {member ? (
          <>
            {profile?.role === "admin" && (
              <Link href="/admin" className="rounded-full px-3 py-2 text-muted hover:text-ink">
                Admin
              </Link>
            )}
            <Link href="/dashboard" className="rounded-full px-3 py-2 text-muted hover:text-ink">
              My journey
            </Link>
            <SignOutButton />
          </>
        ) : (
          <Link href="/login" className="rounded-full px-3 py-2 text-muted hover:text-ink">
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
