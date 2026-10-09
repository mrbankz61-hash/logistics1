"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SERVICES } from "@/lib/content";
import { ServiceIllustration } from "./service-visuals";

/** Plain data only: icon components can't cross the server/client boundary. */
export type ShowcaseService = Omit<(typeof SERVICES)[number], "icon">;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Pinned, scroll-driven showcase: the section is N screens tall, the panel
 * sticks under the header, and scrolling moves through the services while the
 * numbered bars fill. The step buttons jump straight to a service.
 */
export function ServiceShowcase({ services }: { services: readonly ShowcaseService[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [{ index, progress }, setPosition] = useState({ index: 0, progress: 0 });
  const count = services.length;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), Math.max(total, 1));
      const p = total > 0 ? (scrolled / total) * count : 0;
      const i = Math.min(count - 1, Math.floor(p));
      setPosition((prev) => {
        const next = { index: i, progress: Math.min(1, p - i) };
        return prev.index === next.index && Math.abs(prev.progress - next.progress) < 0.004 ? prev : next;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  function goTo(i: number) {
    const el = sectionRef.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + (total * (i + 0.02)) / count;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }

  const service = services[index];

  return (
    <section
      ref={sectionRef}
      aria-label="Our services"
      className="on-dark relative bg-ink-900"
      style={{ height: `${count * 100}svh` }}
    >
      <div className="sticky top-[4.5rem] flex h-[calc(100svh-4.5rem)] flex-col overflow-hidden bg-[radial-gradient(60rem_30rem_at_70%_40%,rgb(47_45_255/0.18),transparent)]">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-14">
            {/* Visual */}
            <div className="min-h-0">
              <div className="relative h-[30svh] overflow-hidden border border-white/10 sm:h-[38svh] lg:h-[56svh]">
                {services.map((s, i) => (
                  <div
                    key={s.slug}
                    className={clsx("absolute inset-0 transition-opacity duration-700", i === index ? "opacity-100" : "opacity-0")}
                    aria-hidden={i !== index}
                  >
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- optional user-supplied photo
                      <img src={s.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ServiceIllustration visual={s.visual} />
                    )}
                  </div>
                ))}
                <span className="absolute top-4 right-4 inline-flex items-center gap-2 border border-white/15 bg-ink-900/80 px-3 py-2 text-xs text-white backdrop-blur">
                  <span className="size-2 rounded-full bg-accent-500" aria-hidden />
                  Live tracking on every job
                </span>
                <div className="absolute inset-x-4 bottom-3 flex justify-between font-mono text-[11px] tracking-[0.14em] text-slate-300 uppercase">
                  <span>
                    {pad(index + 1)} / {service.title}
                  </span>
                  <span className="hidden sm:inline">{service.tagline}</span>
                </div>
              </div>
              <div className="mt-3 flex justify-between font-mono text-xs tracking-[0.16em] text-slate-400 uppercase">
                <span>One team, every drop</span>
                <span>
                  <span className="text-accent-500">{pad(index + 1)}</span> / {pad(count)}
                </span>
              </div>
            </div>

            {/* Copy */}
            <div key={service.slug} className="showcase-fade">
              <p className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-accent-500 uppercase">
                <span className="size-2.5 rotate-45 bg-brand-600" aria-hidden />
                {pad(index + 1)} / {service.title}
              </p>
              <h3 className="mt-4 font-display text-4xl leading-[0.95] font-extrabold text-white uppercase sm:text-5xl lg:text-6xl">
                {service.headline}
              </h3>
              <p className="mt-4 max-w-md leading-relaxed text-slate-300">{service.summary}</p>
              <Link
                href="/contact"
                className="group mt-6 inline-flex min-w-56 items-center justify-between gap-6 border-b border-white/30 pb-3 text-sm font-semibold text-white hover:border-white"
              >
                Talk through your delivery
                <ArrowUpRight className="size-4 text-accent-400" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Steps */}
          <div className="pt-6 pb-5">
            <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
              {services.map((s, i) => {
                const fill = i < index ? 1 : i === index ? Math.max(progress, 0.04) : 0;
                return (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={i === index ? "step" : undefined}
                      className="group block w-full text-left"
                    >
                      <span
                        className={clsx(
                          "font-display text-xl transition-colors sm:text-2xl",
                          i === index ? "text-white" : "text-slate-500 group-hover:text-slate-300",
                        )}
                      >
                        {pad(i + 1)}
                      </span>
                      <span className="sr-only">: show {s.title}</span>
                      <span className="mt-2 block h-1 bg-white/15" aria-hidden>
                        <span className="block h-full origin-left bg-accent-500" style={{ transform: `scaleX(${fill})` }} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] tracking-[0.16em] uppercase">
              <span className="inline-flex items-center gap-2 text-slate-400">
                Scroll to explore <ArrowDown className="size-3 text-accent-500" aria-hidden />
              </span>
              <Link href="/services" className="inline-flex items-center gap-2 text-white hover:text-accent-400">
                All services <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
