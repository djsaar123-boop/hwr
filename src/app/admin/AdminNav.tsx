"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/ui";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/questions", label: "Areas & questions" },
  { href: "/admin/bands", label: "Score bands" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="no-scrollbar -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-line px-4">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cx(
              "-mb-px border-b-2 px-3 py-3 text-sm whitespace-nowrap",
              active ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
