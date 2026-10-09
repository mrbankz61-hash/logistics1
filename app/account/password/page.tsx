import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/spinner";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
};

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>
        <h1 className="mt-8 font-display text-2xl font-bold text-slate-900">Set your password</h1>
        <p className="mt-1 text-sm text-slate-600">You&apos;ll use it with your email to sign in to the dashboard.</p>
        <Suspense fallback={<Skeleton className="mt-6 h-48 w-full" />}>
          <SignedInForm />
        </Suspense>
      </div>
    </main>
  );
}

async function SignedInForm() {
  await connection();
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?error=link");
  return <PasswordForm email={typeof data.claims.email === "string" ? data.claims.email : ""} />;
}
