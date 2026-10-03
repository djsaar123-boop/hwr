import { redirect } from "next/navigation";
import AdminNav from "./AdminNav";
import SiteHeader from "@/components/SiteHeader";
import { getViewer } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getViewer();
  if (!user || user.is_anonymous) redirect("/login");
  if (profile?.role !== "admin") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 pt-16 text-center">
          <p className="font-serif text-2xl">Admins only</p>
          <p className="mt-2 text-sm text-muted">
            Ask an admin to set your role, or run in Supabase:
            <code className="mt-2 block rounded-lg bg-surface p-2 text-xs">
              update profiles set role = &apos;admin&apos; where email = &apos;{user.email}&apos;;
            </code>
          </p>
        </main>
      </>
    );
  }
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pb-24 lg:px-8">
        <AdminNav />
        {children}
      </div>
    </>
  );
}
