"use client";

import clsx from "clsx";
import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { brand, telHref, whatsappHref } from "@/lib/brand";

const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/track", label: "Track" },
];

type Variant = "desktop" | "overlay";

function isActive(pathname: string | null, href: string) {
  return pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
}

function NavLinks({ pathname, variant, onNavigate }: { pathname: string | null; variant: Variant; onNavigate?: () => void }) {
  return LINKS.map(({ href, label }, i) => {
    const active = isActive(pathname, href);
    return variant === "desktop" ? (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "relative px-3 py-2 text-sm font-medium transition-colors",
          active ? "text-white after:absolute after:inset-x-3 after:-bottom-0.5 after:h-px after:bg-accent-500" : "text-slate-300 hover:text-white",
        )}
      >
        {label}
      </Link>
    ) : (
      <li key={href} className="border-b border-white/10">
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className="group flex items-baseline justify-between gap-4 py-5"
        >
          <span className="flex items-baseline gap-4">
            <span className="font-mono text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</span>
            <span className={clsx("font-display text-4xl font-extrabold uppercase", active ? "text-accent-500" : "text-white")}>{label}</span>
          </span>
          <ArrowUpRight className="size-5 text-slate-400 transition-colors group-hover:text-accent-400" aria-hidden />
        </Link>
      </li>
    );
  });
}

/** Reads the URL, so it streams in; the fallback renders the same links without the active state. */
function ActiveNavLinks(props: { variant: Variant; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} {...props} />;
}

function Links(props: { variant: Variant; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavLinks pathname={null} {...props} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    firstLinkRef.current?.querySelector("a")?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[1300] focus:bg-white focus:px-3 focus:py-2 focus:text-slate-950"
      >
        Skip to content
      </a>

      {/* Utility bar */}
      <div className="on-dark border-b border-white/10 bg-ink-950">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-4 px-4 font-mono text-[11px] tracking-[0.14em] text-slate-300 uppercase sm:px-6 lg:px-10">
          <p className="truncate">Deliveries, tracked in the open.</p>
          <a href={telHref(brand.phone)} className="inline-flex shrink-0 items-center gap-2 text-white hover:text-accent-400">
            Talk to dispatch
            <ArrowUpRight className="size-3.5 text-accent-500" aria-hidden />
          </a>
        </div>
      </div>

      <header className="on-dark sticky top-0 z-[1100] border-b border-white/10 bg-ink-900">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label={`${brand.name} home`} onClick={() => setOpen(false)}>
            <Logo inverted subLabel="Courier & dispatch" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-2 lg:flex">
            <Links variant="desktop" />
            <a
              href={telHref(brand.phone)}
              className="ml-4 inline-flex h-11 items-center gap-2 bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Phone className="size-4" aria-hidden />
              {brand.phoneDisplay}
            </a>
          </nav>

          <button
            type="button"
            className="inline-flex items-center gap-3 py-2 text-base font-medium text-white lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
          >
            {open ? "CLOSE" : "MENU"}
            <span className="relative block h-3 w-6" aria-hidden>
              <span className={clsx("absolute left-0 h-0.5 w-6 bg-white transition-transform", open ? "top-1.5 rotate-45" : "top-0")} />
              <span className={clsx("absolute left-0 h-0.5 w-6 bg-white transition-transform", open ? "top-1.5 -rotate-45" : "top-2.5")} />
            </span>
          </button>
        </div>
      </header>

      {open && (
        <div id="site-menu" className="on-dark bg-dot-grid fixed inset-0 z-[1090] overflow-y-auto bg-ink-900 pt-28 lg:hidden">
          <nav aria-label="Main" className="px-4 sm:px-6">
            <div ref={firstLinkRef}>
              <ul>
                <Links variant="overlay" onNavigate={() => setOpen(false)} />
              </ul>
            </div>
            <div className="mt-10 space-y-3 pb-10">
              <a href={telHref(brand.phone)} className="flex h-14 items-center justify-between bg-brand-600 px-5 font-semibold text-white">
                <span className="inline-flex items-center gap-3">
                  <Phone className="size-4" aria-hidden />
                  Call {brand.phoneDisplay}
                </span>
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
              <a
                href={whatsappHref(brand.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="flex h-14 items-center justify-between border border-white/30 px-5 font-semibold text-white"
              >
                <span className="inline-flex items-center gap-3">
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </span>
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
              <p className="pt-4 font-mono text-xs tracking-[0.14em] text-slate-400 uppercase">{brand.hours}</p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
