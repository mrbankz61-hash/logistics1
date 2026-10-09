import type { Metadata } from "next";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { Container, CtaBand, DisplayHeading, Eyebrow, PageHero } from "@/components/site/sections";
import { ServiceIllustration } from "@/components/site/service-visuals";
import { brand } from "@/lib/brand";
import { SERVICES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description: `Same-day, next-day, scheduled and specialist deliveries from ${brand.name}.`,
};

const FAQ = [
  {
    q: "How is the price worked out?",
    a: "By distance, size and how soon it needs to arrive. Tell us the pickup and delivery addresses and we'll quote on the spot.",
  },
  {
    q: "How accurate is the tracking?",
    a: "Our drivers check in with dispatch by phone. Each time they do, we update the position and arrival estimate. Between check-ins, the map shows our best estimate of where the vehicle is along the route.",
  },
  {
    q: "What can't you carry?",
    a: "Anything illegal, dangerous goods, live animals, and cash. If you're not sure, ask us before booking.",
  },
  {
    q: "What if nobody is home?",
    a: "The driver calls the receiver first. If we still can't deliver, we arrange a new time with you at no extra charge for the first attempt.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="Services" title="Sized to" accent="the job.">
        Whether it&apos;s one urgent envelope or a weekly round of shop deliveries, every shipment gets a tracking page and
        a team on the phone.
      </PageHero>

      <section className="bg-white">
        <Container className="divide-y divide-slate-200">
          {SERVICES.map(({ slug, title, headline, summary, details, visual, image }, i) => (
            <article key={slug} id={slug} className="grid scroll-mt-24 gap-8 py-14 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
              <div className={clsx("aspect-[16/11] overflow-hidden border border-slate-200", i % 2 === 1 && "lg:order-2")}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- optional user-supplied photo
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ServiceIllustration visual={visual} />
                )}
              </div>
              <div>
                <p className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-slate-600 uppercase">
                  <span className="size-2.5 rotate-45 bg-brand-600" aria-hidden />
                  {String(i + 1).padStart(2, "0")} / {title}
                </p>
                <h2 className="mt-4 font-display text-4xl leading-[0.95] font-extrabold text-slate-950 uppercase sm:text-5xl">{headline}</h2>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">{summary}</p>
                <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6">
                  {details.map((d) => (
                    <li key={d} className="flex items-start gap-3 text-slate-800">
                      <span className="mt-2 size-1.5 shrink-0 rotate-45 bg-accent-500" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </Container>
      </section>

      <section className="bg-[#f6f6f8] py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <DisplayHeading className="mt-6" accent="questions." accentTone="brand">
              Common
            </DisplayHeading>
          </div>
          <div className="border-t border-slate-300">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group border-b border-slate-300 py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold text-slate-950">
                  {q}
                  <Plus className="size-5 shrink-0 text-brand-600 transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
