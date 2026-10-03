export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-4 pt-10 pb-20">
      <h1 className="font-serif text-3xl font-medium">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      <div className="mt-8 rounded-3xl border border-line bg-surface p-5 sm:p-6">{children}</div>
    </main>
  );
}
