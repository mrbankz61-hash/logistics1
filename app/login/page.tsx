import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Globe } from "@/components/site/globe";
import { GLOBE_HUBS, GLOBE_START_LNG } from "@/lib/content";
import { Skeleton } from "@/components/ui/spinner";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="on-dark bg-dot-grid relative isolate hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Globe hubs={GLOBE_HUBS} startLng={GLOBE_START_LNG} maxFlights={4} showControl={false} className="absolute inset-0 -z-10 opacity-70" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(7_9_20/0.95)_0%,rgb(7_9_20/0.6)_55%,transparent_100%)]" aria-hidden />
        <Link href="/" className="w-fit">
          <Logo inverted subLabel="Courier & dispatch" />
        </Link>
        <div className="max-w-md">
          <p className="flex items-center gap-3 font-mono text-xs tracking-[0.22em] text-slate-300 uppercase">
            <span className="size-2.5 rotate-45 bg-brand-600" aria-hidden />
            Staff only
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[0.95] font-extrabold uppercase">
            Dispatch <span className="text-accent-500">dashboard.</span>
          </h1>
          <p className="mt-5 text-slate-300">
            Record driver and customer calls, keep every shipment&apos;s position and ETA honest, and let customers
            follow along.
          </p>
        </div>
        <p className="font-mono text-xs tracking-[0.16em] text-slate-400 uppercase">Activity is logged.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h2 className="font-display text-3xl font-extrabold text-slate-950 uppercase">Staff sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Use the email and password your admin set up for you.</p>
          <Suspense fallback={<Skeleton className="mt-8 h-56 w-full" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
