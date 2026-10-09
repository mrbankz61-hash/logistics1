"use client";

import clsx from "clsx";
import { MapPin, MessageCircle, PackageSearch, Phone, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LocalTime } from "@/components/local-time";
import { RouteMap } from "@/components/map";
import { TrackingForm } from "@/components/site/tracking-form";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/spinner";
import { brand, telHref, whatsappHref } from "@/lib/brand";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/format";
import { useLiveMovement, type LiveMovement } from "@/lib/hooks";
import { usePublicTracking } from "@/lib/public-tracking";
import { STATUS_LABELS, type PublicTracking } from "@/lib/types";

export function TrackingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading tracking information">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[26rem] lg:col-span-2" />
        <Skeleton className="h-[26rem]" />
      </div>
    </div>
  );
}

export function TrackingView({ trackingNumber }: { trackingNumber: string }) {
  const state = usePublicTracking(trackingNumber);

  if (state.status === "loading") return <TrackingSkeleton />;
  if (state.status === "not_found") return <NotFound trackingNumber={trackingNumber} />;
  if (state.status === "error") return <LoadError message={state.message} trackingNumber={trackingNumber} />;
  return <Tracking data={state.data} />;
}

function Tracking({ data }: { data: PublicTracking }) {
  const live = useLiveMovement(data.movement);
  const percent = live ? Math.round(live.fraction * 100) : null;
  const lastUpdate = data.timeline[data.timeline.length - 1];

  return (
    <div className="space-y-6">
      <StatusAnnouncer status={STATUS_LABELS[data.status]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">Tracking number</p>
          <h1 className="font-mono text-2xl font-bold tracking-wide text-slate-950 sm:text-4xl">{data.trackingNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
          <StatusBadge status={data.status} size="lg" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="map-heading" className="overflow-hidden border border-slate-200 bg-white shadow-sm">
            <h2 id="map-heading" className="sr-only">
              Route map
            </h2>
            <RouteMap
              label={`Map of the route from ${data.origin.label} to ${data.destination.label}`}
              className="h-80 w-full sm:h-[28rem]"
              route={data.route}
              origin={data.origin}
              destination={data.destination}
              fraction={live?.fraction ?? null}
              moving={live?.state === "moving"}
            />
            <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-slate-500" aria-hidden />
                <span>
                  <span className="font-semibold text-slate-900">{data.origin.label}</span> to{" "}
                  <span className="font-semibold text-slate-900">{data.destination.label}</span>
                </span>
              </span>
              <span className="text-xs text-slate-600">The truck icon shows an estimated position based on our latest update.</span>
            </div>
          </section>
        </div>

        <aside className="space-y-6" aria-label="Delivery summary">
          <section className="border border-slate-200 bg-white p-5 shadow-sm">
            <EtaPanel data={data} live={live} />
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-slate-700">Journey progress</span>
                <span className="font-semibold text-slate-900">{percent === null ? "…" : `${percent}%`}</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden bg-slate-200"
                role="progressbar"
                aria-label="Journey progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent ?? undefined}
              >
                <div className="h-full bg-accent-500 transition-[width] duration-1000" style={{ width: `${percent ?? 0}%` }} />
              </div>
            </div>
            {lastUpdate && (
              <p className="mt-4 text-xs text-slate-600">
                Last confirmed update: <LocalTime ms={lastUpdate.at} />, {lastUpdate.locationLabel}
              </p>
            )}
          </section>

          <section className="border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-bold text-slate-900">Questions about this delivery?</h2>
            <p className="mt-1 text-sm text-slate-600">Our team can check with the driver for you.</p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={telHref(brand.phone)}
                className="inline-flex h-11 items-center justify-center gap-2 bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Phone className="size-4" aria-hidden />
                Call {brand.phoneDisplay}
              </a>
              <a
                href={whatsappHref(brand.whatsapp, `Hello, I'm asking about shipment ${data.trackingNumber}.`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp us<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </section>
        </aside>
      </div>

      <section aria-labelledby="timeline-heading" className="border border-slate-200 bg-white shadow-sm">
        <h2 id="timeline-heading" className="border-b border-slate-200 px-5 py-4 font-display text-base font-bold text-slate-900">
          Updates
        </h2>
        <PublicTimeline data={data} />
      </section>
    </div>
  );
}

function EtaPanel({ data, live }: { data: PublicTracking; live: LiveMovement | null }) {
  if (!live) {
    return (
      <div>
        <p className="text-sm font-medium text-slate-600">Estimated arrival</p>
        <Skeleton className="mt-2 h-8 w-48" />
      </div>
    );
  }

  let heading = "Estimated arrival";
  let value: string;
  let detail: string;

  if (data.status === "delivered") {
    heading = "Delivered";
    value = formatDateTime(data.movement.anchorTime);
    detail = "Your shipment has been delivered.";
  } else if (live.state === "not_started") {
    heading = "Awaiting pickup";
    value = "Not on the road yet";
    detail = `Once it's picked up, the trip should take about ${formatDuration(data.movement.remainingMs)}.`;
  } else if (live.state === "paused") {
    heading = "Estimated arrival";
    value = "Paused";
    detail = `Your shipment has stopped for now. About ${formatDuration(live.remainingMs)} of travel remains; we'll update the estimate when it's moving again.`;
  } else if (live.state === "arrived") {
    value = "Arriving now";
    detail = "The driver should be with you shortly.";
  } else {
    const eta = data.movement.anchorTime + data.movement.remainingMs;
    value = formatDateTime(eta);
    detail = `About ${formatRelative(eta, live.now).replace(/^in /, "")} from now. This is an estimate based on the latest update from the driver and may change.`;
  }

  return (
    <div aria-live="polite">
      <p className="text-sm font-medium text-slate-600">{heading}</p>
      <p
        className={clsx(
          "mt-1 font-display text-2xl font-extrabold",
          value === "Paused" ? "text-amber-800" : data.status === "delivered" ? "text-emerald-800" : "text-slate-900",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function PublicTimeline({ data }: { data: PublicTracking }) {
  const events = [...data.timeline].reverse();
  if (events.length === 0) return <p className="px-5 py-6 text-sm text-slate-600">No updates yet.</p>;
  return (
    <ol className="px-5 py-2">
      {events.map((event, i) => (
        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-2">
          {i < events.length - 1 && <span className="absolute top-4 left-[7px] h-full w-0.5 bg-slate-200" aria-hidden />}
          <span
            className={clsx(
              "relative mt-1.5 size-4 shrink-0 rounded-full border-4",
              i === 0 ? "border-brand-600 bg-white" : "border-slate-300 bg-white",
            )}
            aria-hidden
          />
          <div className="min-w-0 pt-0.5">
            <p className="font-semibold text-slate-900">{event.title}</p>
            <p className="text-sm text-slate-600">
              <LocalTime ms={event.at} /> · {event.locationLabel}
            </p>
            {event.note && <p className="mt-1.5 text-sm text-slate-800">{event.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Announces status changes to screen readers when the live document updates. */
function StatusAnnouncer({ status }: { status: string }) {
  const previous = useRef(status);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (previous.current !== status) {
      previous.current = status;
      const id = window.setTimeout(() => setMessage(`Status updated: ${status}`), 0);
      return () => window.clearTimeout(id);
    }
  }, [status]);
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {message}
    </p>
  );
}

function NotFound({ trackingNumber }: { trackingNumber: string }) {
  return (
    <div className="mx-auto max-w-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <PackageSearch className="mx-auto size-12 text-brand-600" aria-hidden />
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">We couldn&apos;t find that shipment</h1>
      <p className="mt-2 text-slate-700">
        No shipment matches <span className="font-mono font-semibold break-all">{trackingNumber}</span>. Check the number
        and try again. New bookings can take a few minutes to appear.
      </p>
      <div className="mt-6 text-left">
        <TrackingForm />
      </div>
      <p className="mt-6 text-sm text-slate-600">
        Still stuck?{" "}
        <a href={telHref(brand.phone)} className="font-semibold text-brand-700 hover:underline">
          Call {brand.phoneDisplay}
        </a>
      </p>
    </div>
  );
}

function LoadError({ message, trackingNumber }: { message: string; trackingNumber: string }) {
  return (
    <div role="alert" className="mx-auto max-w-xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <h1 className="font-display text-2xl font-bold text-slate-900">Tracking is temporarily unavailable</h1>
      <p className="mt-2 text-slate-700">{message}</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center justify-center gap-2 bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <RotateCcw className="size-4" aria-hidden />
          Try again
        </button>
        <a
          href={telHref(brand.phone)}
          className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <Phone className="size-4" aria-hidden />
          Call about {trackingNumber}
        </a>
      </div>
    </div>
  );
}
