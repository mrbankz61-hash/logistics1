import type { Metadata } from "next";
import { Headphones, Route, Truck } from "lucide-react";
import { Container, CtaBand, DisplayHeading, Eyebrow, KeywordStrip, PageHero } from "@/components/site/sections";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About us",
  description: `Who we are and how ${brand.name} keeps every delivery on track.`,
};

const VALUES = [
  { title: "Straight answers", text: "If a delivery is running late, we say so and give you a new estimate." },
  { title: "Care in the handover", text: "Packages are handed to a person, not left on a doorstep, unless you ask us to." },
  { title: "Local knowledge", text: "Our drivers know the roads, the shortcuts and which gates are locked after six." },
];

const TRACKING_STEPS = [
  { icon: Headphones, title: "Driver checks in", text: "A quick call to dispatch: where they are, any delays." },
  { icon: Route, title: "Dispatch updates the shipment", text: "Position, status and arrival estimate, recorded in our system." },
  { icon: Truck, title: "Your tracking page updates", text: "Instantly, without refreshing. Every update is listed in the timeline." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About us" title="We pick up." accent="The phone too.">
        {brand.name} started with one van and a simple promise: tell customers the truth about where their delivery is.
        Replace this paragraph with your own story.
      </PageHero>

      <section className="bg-[#f6f6f8] py-20 sm:py-28">
        <Container className="grid gap-14 lg:grid-cols-2 lg:items-start">
          <div>
            <Eyebrow>How tracking works</Eyebrow>
            <DisplayHeading className="mt-6" accent="real drivers." accentTone="brand">
              Real updates from
            </DisplayHeading>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              We don&apos;t use GPS boxes. Our drivers call dispatch at pickup, on the road and at each stop, and our team
              records each update. Between calls, the tracking map estimates the vehicle&apos;s position along the planned
              route, and the arrival time is adjusted whenever we learn something new.
            </p>
          </div>
          <ol className="border-t border-slate-300">
            {TRACKING_STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-5 border-b border-slate-300 py-6">
                <span className="font-mono text-sm text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                <span className="grid size-11 shrink-0 place-items-center bg-brand-600 text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-lg font-bold text-slate-950">{title}</span>
                  <span className="mt-1 block text-slate-600">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="on-dark bg-dot-grid bg-ink-900 py-20 sm:py-28">
        <Container>
          <Eyebrow tone="dark">What we stand for</Eyebrow>
          <DisplayHeading tone="dark" className="mt-6" accent="values.">
            Our
          </DisplayHeading>
          <ul className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <li key={v.title} className="bg-ink-900 p-6 lg:p-8">
                <span className="font-mono text-sm text-accent-400">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-display text-2xl font-bold text-white uppercase">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-300">{v.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-14">
            <KeywordStrip tone="dark" items={["Phone dispatch", "Honest ETAs", "Local drivers", "Signed deliveries"]} />
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
