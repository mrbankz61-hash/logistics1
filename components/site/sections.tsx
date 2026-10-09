import clsx from "clsx";
import { ArrowDown, ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { brand, telHref, whatsappHref } from "@/lib/brand";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** "◆ LABEL" in spaced monospace capitals. */
export function Eyebrow({ children, tone = "light", className }: { children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <p
      className={clsx(
        "flex items-center gap-3 font-mono text-xs font-medium tracking-[0.22em] uppercase",
        tone === "dark" ? "text-slate-300" : "text-slate-600",
        className,
      )}
    >
      <span className="size-2.5 rotate-45 bg-brand-600" aria-hidden />
      {children}
    </p>
  );
}

/** Big uppercase display heading. `accent` is appended in the accent colour. */
export function DisplayHeading({
  as: Tag = "h2",
  children,
  accent,
  tone = "light",
  accentTone = "accent",
  size = "lg",
  className,
}: {
  as?: "h1" | "h2" | "h3";
  children: ReactNode;
  accent?: ReactNode;
  tone?: "light" | "dark";
  accentTone?: "accent" | "brand";
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <Tag
      className={clsx(
        "font-display font-extrabold tracking-[-0.02em] uppercase",
        size === "xl" && "text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-[5.5rem]",
        size === "lg" && "text-4xl leading-[0.98] sm:text-5xl lg:text-6xl",
        size === "md" && "text-3xl leading-none sm:text-4xl",
        tone === "dark" ? "text-white" : "text-slate-950",
        className,
      )}
    >
      {children}
      {accent && (
        <>
          {" "}
          <span className={accentTone === "accent" ? "text-accent-500" : "text-brand-600"}>{accent}</span>
        </>
      )}
    </Tag>
  );
}

type SiteButtonVariant = "primary" | "white" | "outline-dark" | "outline-light";

/** Sharp-cornered marketing buttons. */
export function siteButtonClasses(variant: SiteButtonVariant = "primary", className?: string) {
  return clsx(
    "inline-flex h-14 items-center justify-between gap-6 px-5 text-sm font-semibold transition-colors",
    variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
    variant === "white" && "bg-white text-slate-950 hover:bg-slate-100",
    variant === "outline-dark" && "border border-white/30 text-white hover:border-white/60 hover:bg-white/5",
    variant === "outline-light" && "border border-slate-300 text-slate-950 hover:border-slate-500",
    className,
  );
}

/** Underlined text link with a ↗, as used under section copy. */
export function ArrowLink({
  href,
  children,
  tone = "light",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group inline-flex min-w-56 items-center justify-between gap-6 border-b pb-3 text-sm font-semibold",
        tone === "dark" ? "border-white/30 text-white hover:border-white" : "border-slate-300 text-slate-950 hover:border-slate-900",
        className,
      )}
    >
      {children}
      <ArrowUpRight
        className={clsx("size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5", tone === "dark" ? "text-accent-400" : "text-brand-600")}
        aria-hidden
      />
    </Link>
  );
}

/** Dark page header used by the inner pages. */
export function PageHero({
  eyebrow,
  title,
  accent,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="on-dark bg-dot-grid relative overflow-hidden border-b border-white/10 bg-ink-900">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-brand-600/20 blur-3xl" aria-hidden />
      <Container className="relative py-16 sm:py-24">
        <Eyebrow tone="dark">{eyebrow}</Eyebrow>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <DisplayHeading as="h1" tone="dark" accent={accent} size="xl">
              {title}
            </DisplayHeading>
            {children && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{children}</p>}
          </div>
          {aside}
        </div>
      </Container>
    </section>
  );
}

/** Mono labels between two hairlines, separated by diamonds. */
export function KeywordStrip({ items, tone = "light" }: { items: readonly string[]; tone?: "light" | "dark" }) {
  return (
    <ul
      className={clsx(
        "flex flex-wrap items-center gap-x-5 gap-y-3 border-y py-6 font-mono text-[13px] tracking-[0.12em] uppercase",
        tone === "dark" ? "border-white/15 text-slate-300" : "border-slate-300 text-slate-700",
      )}
    >
      {items.map((item, i) => (
        <li key={item} className="flex items-center gap-5">
          {i > 0 && <span className="size-2 rotate-45 bg-brand-600" aria-hidden />}
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ScrollCue({ label = "Scroll to explore", href = "#main-content" }: { label?: string; href?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-slate-300 uppercase hover:text-white">
      {label}
      <ArrowDown className="size-3.5 text-accent-500" aria-hidden />
    </a>
  );
}

export function CtaBand() {
  return (
    <section className="on-dark relative overflow-hidden bg-brand-600">
      <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <Container className="relative grid gap-10 py-20 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <Eyebrow tone="dark" className="[&>span]:bg-white">
            Book a delivery
          </Eyebrow>
          <DisplayHeading tone="dark" className="mt-5">
            Ready when you are.
          </DisplayHeading>
          <p className="mt-5 max-w-xl text-lg text-brand-100">
            Call or message with the pickup and delivery addresses. We&apos;ll confirm a price and a time window on the spot.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <a href={telHref(brand.phone)} className={siteButtonClasses("white")}>
            <span className="inline-flex items-center gap-3">
              <Phone className="size-4" aria-hidden />
              Call {brand.phoneDisplay}
            </span>
            <ArrowUpRight className="size-4 text-brand-600" aria-hidden />
          </a>
          <a
            href={whatsappHref(brand.whatsapp, "Hello, I'd like to book a delivery.")}
            target="_blank"
            rel="noreferrer"
            className={siteButtonClasses("outline-dark")}
          >
            <span className="inline-flex items-center gap-3">
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp us<span className="sr-only"> (opens in a new tab)</span>
            </span>
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
          <Link href="/contact" className={siteButtonClasses("outline-dark")}>
            Send a message
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
