import Link from "next/link";

const AREAS = [
  { emoji: "🏃", name: "Health", color: "#5E9C76" },
  { emoji: "💰", name: "Wealth", color: "#C9973F" },
  { emoji: "💕", name: "Relationships", color: "#C46B78" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-72px)] max-w-3xl flex-col items-center justify-center px-4 pb-16 text-center">
      <div className="flex -space-x-3" aria-hidden>
        {AREAS.map((a) => (
          <span
            key={a.name}
            className="grid size-14 place-items-center rounded-full text-2xl ring-4 ring-bg"
            style={{ background: `color-mix(in srgb, ${a.color} 26%, var(--bg))` }}
          >
            {a.emoji}
          </span>
        ))}
      </div>
      <h1 className="mt-8 font-serif text-[34px] leading-[1.1] font-medium text-balance sm:text-5xl">
        Your 5-minute holistic wellbeing check-in
      </h1>
      <p className="mt-4 text-lg text-muted">Health · Wealth · Relationships</p>
      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
        23 honest questions. A scorecard that shows what&apos;s working, and the few small shifts that would matter most.
      </p>
      <Link href="/assess" className="btn btn-primary mt-10 min-h-13 px-10 text-base">
        Begin
      </Link>
      <p className="mt-4 text-xs text-muted">No sign-up needed · about 5 minutes</p>
      <p className="mt-10 max-w-sm text-xs leading-relaxed text-muted">
        Your answers are private to you. This is a reflection tool, not a medical assessment.
      </p>
    </main>
  );
}
