import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { siteButtonClasses } from "@/components/site/sections";

export default function NotFound() {
  return (
    <main className="on-dark bg-dot-grid flex min-h-dvh flex-col items-center justify-center bg-ink-900 px-4 py-16 text-center">
      <Link href="/" aria-label="Home">
        <Logo inverted />
      </Link>
      <p className="mt-12 font-mono text-sm tracking-[0.3em] text-accent-500">404</p>
      <h1 className="mt-3 font-display text-5xl leading-[0.95] font-extrabold text-white uppercase sm:text-6xl">
        Wrong <span className="text-accent-500">turn.</span>
      </h1>
      <p className="mt-5 max-w-md text-slate-300">The page you were looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <Link href="/" className={siteButtonClasses("primary", "flex-1")}>
          Home
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
        <Link href="/track" className={siteButtonClasses("outline-dark", "flex-1")}>
          Track a shipment
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </main>
  );
}
