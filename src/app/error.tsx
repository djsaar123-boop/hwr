"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="max-w-md">
        <p className="font-serif text-2xl">Something went sideways.</p>
        <p className="mt-2 text-sm text-muted">{error.message || "Please try again in a moment."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
