import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { PageHero } from "@/components/site/sections";
import { TrackingForm } from "@/components/site/tracking-form";
import { brand, telHref } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Track a shipment",
  description: `Follow your ${brand.name} delivery on the map with a live estimated arrival time.`,
};

export default function TrackPage() {
  return (
    <PageHero
      eyebrow="Track"
      title="Where's my"
      accent="parcel?"
      aside={
        <div className="border border-white/15 bg-ink-900/70 p-5 backdrop-blur-sm sm:p-6">
          <TrackingForm tone="dark" label="Your tracking number" autoFocus />
          <div className="mt-6 border-t border-white/10 pt-5 text-sm text-slate-300">
            <p>
              It starts with <span className="font-mono font-semibold text-white">{brand.trackingPrefix}-</span> followed by
              eight letters and numbers. Can&apos;t find it? We&apos;ll look it up for you.
            </p>
            <a href={telHref(brand.phone)} className="mt-3 inline-flex items-center gap-2 font-semibold text-white hover:text-accent-400">
              <Phone className="size-4 text-accent-500" aria-hidden />
              {brand.phoneDisplay}
            </a>
          </div>
        </div>
      }
    >
      Enter the tracking number from your receipt or message to see where your delivery is and when it should arrive.
    </PageHero>
  );
}
