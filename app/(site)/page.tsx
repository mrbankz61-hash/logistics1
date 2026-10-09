import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Globe } from "@/components/site/globe";
import {
  ArrowLink,
  Container,
  CtaBand,
  DisplayHeading,
  Eyebrow,
  KeywordStrip,
  ScrollCue,
  siteButtonClasses,
} from "@/components/site/sections";
import { ServiceShowcase } from "@/components/site/service-showcase";
import { TrackingForm } from "@/components/site/tracking-form";
import { brand } from "@/lib/brand";
import { GLOBE_HUBS, GLOBE_START_LNG, KEYWORDS, REASONS, SERVICES, STEPS } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="on-dark relative isolate overflow-hidden bg-ink-900">
        <div className="bg-dot-grid absolute inset-0 -z-20 opacity-60" aria-hidden />
        <Globe
          hubs={GLOBE_HUBS}
          startLng={GLOBE_START_LNG}
          className="absolute inset-0 -z-10"
          controlClassName="absolute right-4 bottom-[4.5rem] z-10 sm:right-6 lg:right-10"
        />
        {/* Keeps the copy readable over the globe. */}
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_0%,rgb(7_9_20/0.15)_38%,rgb(7_9_20/0.85)_72%)] md:bg-[linear-gradient(90deg,rgb(7_9_20/0.96)_0%,rgb(7_9_20/0.75)_40%,transparent_70%)]"
          aria-hidden
        />
        <Container className="flex min-h-[calc(100svh-7rem)] flex-col justify-between pt-20 pb-6 sm:pt-28">
          <div className="max-w-2xl">
            <Eyebrow tone="dark">{brand.name}</Eyebrow>
            <DisplayHeading as="h1" tone="dark" size="xl" className="mt-6" accent="Delivered.">
              Picked up.
              <br />
              Tracked.
              <br />
            </DisplayHeading>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Same-day and scheduled courier runs across the city and region, with a live tracking page for every
              shipment and a real person on the phone when plans change.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className={siteButtonClasses("primary", "sm:min-w-56")}>
                Book a delivery
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              <a href="#services" className={siteButtonClasses("outline-dark", "sm:min-w-56")}>
                Explore our services
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </div>
            <div className="mt-10 max-w-xl border border-white/15 bg-ink-900/70 p-5 backdrop-blur-sm">
              <TrackingForm tone="dark" label="Already have a shipment?" />
            </div>
          </div>
          <div className="mt-14 flex items-end justify-between gap-6 font-mono text-[11px] tracking-[0.16em] text-slate-400 uppercase">
            <p className="max-w-48">Every parcel. Every stop. On the map.</p>
            <ScrollCue href="#intro" />
          </div>
        </Container>
      </section>

      {/* Intro */}
      <section id="intro" className="scroll-mt-20 bg-[#f6f6f8] py-20 sm:py-28">
        <Container>
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl leading-tight font-bold tracking-tight text-slate-950 sm:text-4xl">
              Getting things across town shouldn&apos;t eat your afternoon.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              We handle the pickup, the route and the updates. You get a price on the phone, a tracking link for your
              customer, and someone to call if plans change, whether it&apos;s one envelope or a weekly round of shop
              deliveries.
            </p>
            <ArrowLink href="/about" className="mt-8">
              Get to know us
            </ArrowLink>
          </div>
          <div className="mt-16">
            <KeywordStrip items={KEYWORDS} />
          </div>
        </Container>
      </section>

      {/* Services intro */}
      <section id="services" className="scroll-mt-20 border-t-2 border-brand-600 bg-[#ececf1] py-20 sm:py-28">
        <Container className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            <Eyebrow>Services</Eyebrow>
            <DisplayHeading size="xl" className="mt-6">
              <span className="text-brand-600">From envelope</span> to pallet.
            </DisplayHeading>
          </div>
          <div>
            <p className="text-lg leading-relaxed text-slate-600">
              Four ways to move it, one team answering the phone. Scroll through what we do, or see every detail on the
              services page.
            </p>
            <ArrowLink href="/services" className="mt-6">
              All services
            </ArrowLink>
          </div>
        </Container>
      </section>

      <ServiceShowcase services={SERVICES.map(({ icon: _icon, ...service }) => service)} />

      {/* How it works */}
      <section className="bg-white py-20 sm:py-28">
        <Container>
          <Eyebrow>How it works</Eyebrow>
          <DisplayHeading className="mt-6" accent="No surprises." accentTone="brand">
            Four steps.
          </DisplayHeading>
          <ol className="mt-14 grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative bg-white p-6 pt-8 lg:p-8">
                <span className="absolute top-0 left-0 h-0.5 w-12 bg-accent-500" aria-hidden />
                <span className="font-mono text-sm text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-display text-2xl font-bold text-slate-950 uppercase">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Why us */}
      <section className="on-dark bg-dot-grid bg-ink-900 py-20 sm:py-28">
        <Container className="grid gap-14 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <Eyebrow tone="dark">Why us</Eyebrow>
            <DisplayHeading tone="dark" className="mt-6" accent="Straight answers.">
              A local team.
            </DisplayHeading>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Quick answers, drivers who know the roads, and a tracking page that reflects what&apos;s actually happening.
            </p>
          </div>
          <ul className="grid gap-px bg-white/10 sm:grid-cols-2">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-ink-900 p-6 lg:p-8">
                <span className="grid size-11 place-items-center border border-white/15 text-accent-400">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-6 font-display text-xl font-bold text-white">{title}</h3>
                <p className="mt-2 leading-relaxed text-slate-300">{text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
