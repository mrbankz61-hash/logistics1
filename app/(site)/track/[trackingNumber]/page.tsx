import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Eyebrow } from "@/components/site/sections";
import { normalizeTrackingNumber } from "@/lib/tracking-number";
import { TrackingSkeleton, TrackingView } from "./tracking-view";

export const metadata: Metadata = {
  title: "Shipment tracking",
  robots: { index: false, follow: false },
};

export default function TrackingPage({ params }: PageProps<"/track/[trackingNumber]">) {
  return (
    <>
      <section className="on-dark bg-dot-grid border-b border-white/10 bg-ink-900">
        <Container className="py-8 sm:py-10">
          <Eyebrow tone="dark">Shipment tracking</Eyebrow>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Live view of your delivery. The truck shows an estimated position based on the latest update from our driver.
          </p>
        </Container>
      </section>
      <div className="bg-[#f6f6f8]">
        <Container className="py-8 sm:py-12">
          <Suspense fallback={<TrackingSkeleton />}>
            {params.then(({ trackingNumber }) => (
              <TrackingView trackingNumber={normalizeTrackingNumber(safeDecode(trackingNumber))} />
            ))}
          </Suspense>
        </Container>
      </div>
    </>
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
