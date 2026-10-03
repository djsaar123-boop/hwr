import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in — HWR" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const { error, email } = await searchParams;
  return <LoginForm initialError={error ?? null} initialEmail={email ?? ""} />;
}
