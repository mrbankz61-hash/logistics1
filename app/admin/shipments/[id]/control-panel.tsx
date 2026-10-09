"use client";

import clsx from "clsx";
import {
  ChevronLeft,
  Clock,
  Copy,
  Crosshair,
  ExternalLink,
  ListChecks,
  MessageSquarePlus,
  Pause,
  Play,
  Signpost,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { RouteMap } from "@/components/map";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { etaSummary } from "@/lib/eta";
import { formatDistance, formatDuration } from "@/lib/format";
import { LocalTime } from "@/components/local-time";
import { useLiveMovement } from "@/lib/hooks";
import { snapToRoute, type SnapResult } from "@/lib/movement";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { subscribePublicTracking } from "@/lib/public-tracking";
import type { StaffUser } from "@/lib/auth/session";
import type { Shipment } from "@/lib/types";
import { ActionForm, type ActionMode } from "./action-form";
import { ContactsCard, DetailsCard } from "./details";
import { AdminTimeline } from "./timeline";

interface ActionDef {
  mode: ActionMode;
  label: string;
  description: string;
  icon: typeof Play;
  primary?: boolean;
}

/** Reload server data when another staff member changes this shipment. */
function useRemoteChanges(trackingNumber: string, version: number) {
  const router = useRouter();
  const versionRef = useRef(version);
  useEffect(() => {
    versionRef.current = version;
  }, [version]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    return subscribePublicTracking(
      trackingNumber,
      (data) => {
        if (data && data.version > versionRef.current) router.refresh();
      },
      () => {},
    );
  }, [trackingNumber, router]);
}

export function ControlPanel({ shipment, user }: { shipment: Shipment; user: StaffUser }) {
  const live = useLiveMovement(shipment.movement);
  const [mode, setMode] = useState<ActionMode | null>(null);
  const [picked, setPicked] = useState<SnapResult | null>(null);
  useRemoteChanges(shipment.trackingNumber, shipment.version);

  const state = live?.state ?? shipment.movement.state;
  const delivered = shipment.status === "delivered";
  const eta = live ? etaSummary(shipment.status, shipment.movement, live.now) : null;

  const actions: ActionDef[] = [
    ...(state === "not_started"
      ? [{ mode: "start" as const, label: "Start", description: "Begin movement along the route", icon: Play, primary: true }]
      : []),
    ...(state === "moving" ? [{ mode: "pause" as const, label: "Pause", description: "Driver stopped", icon: Pause, primary: true }] : []),
    ...(state === "paused" ? [{ mode: "resume" as const, label: "Resume", description: "Back on the road", icon: Play, primary: true }] : []),
    { mode: "set_position", label: "Set position", description: "Pick a point on the map", icon: Crosshair },
    ...(!delivered && state !== "arrived"
      ? [{ mode: "adjust_eta" as const, label: "Adjust ETA", description: "Faster or slower than planned", icon: Clock }]
      : []),
    { mode: "change_status", label: "Change status", description: "Out for delivery, delivered…", icon: ListChecks },
    ...(!delivered ? [{ mode: "reroute" as const, label: "Re-route", description: "New destination or waypoint", icon: Signpost }] : []),
    { mode: "note", label: "Log update", description: "Record a call, no movement change", icon: MessageSquarePlus },
  ];

  function selectMode(next: ActionMode | null) {
    setMode(next);
    setPicked(null);
  }

  async function copyLink() {
    const url = `${window.location.origin}/track/${shipment.trackingNumber}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tracking link copied");
    } catch {
      toast.error("Couldn't copy. The link is " + url);
    }
  }

  const pickMode = mode === "set_position";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ChevronLeft className="size-4" aria-hidden />
          Shipments
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-xl font-bold text-slate-900 sm:text-2xl">{shipment.trackingNumber}</h1>
              <StatusBadge status={shipment.status} size="lg" />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {shipment.origin.label} → {shipment.destination.label} · created <LocalTime ms={shipment.createdAt} format="date" /> by{" "}
              {shipment.createdBy.name}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Copy className="size-4" aria-hidden />
              Copy link
            </button>
            <a
              href={`/track/${shipment.trackingNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <ExternalLink className="size-4" aria-hidden />
              Public page
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="contents lg:col-span-2 lg:block lg:space-y-6">
          <Card className="order-1 overflow-hidden">
            <div className="relative">
              <RouteMap
                label={`Route map for ${shipment.trackingNumber}`}
                className="h-80 w-full sm:h-[26rem]"
                route={shipment.route}
                origin={shipment.origin}
                destination={shipment.destination}
                waypoints={shipment.waypoints}
                fraction={live?.fraction ?? null}
                moving={state === "moving"}
                pickMode={pickMode}
                onPick={(point) => setPicked(snapToRoute(shipment.route.points, shipment.route.cumulative, point))}
                pickedPoint={picked}
              />
              {pickMode && (
                <p className="pointer-events-none absolute top-3 right-3 left-14 z-[1000] rounded-lg bg-amber-50/95 px-3 py-2 text-sm font-medium text-amber-950 shadow ring-1 ring-amber-300">
                  Click the map where the driver is. The point snaps to the nearest spot on the route.
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
              <Stat label="Progress">
                {live ? (
                  <>
                    {Math.round(live.fraction * 100)}%
                    <span
                      className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-200"
                      role="progressbar"
                      aria-label="Route progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(live.fraction * 100)}
                    >
                      <span className="block h-full bg-brand-600" style={{ width: `${live.fraction * 100}%` }} />
                    </span>
                  </>
                ) : (
                  "…"
                )}
              </Stat>
              <Stat label="Estimated arrival">
                {eta ? (
                  <>
                    <span className="block">{eta.label}</span>
                    {eta.detail && <span className="block text-xs font-normal text-slate-600">{eta.detail}</span>}
                  </>
                ) : (
                  "…"
                )}
              </Stat>
              <Stat label="Time left">{live ? (delivered ? "None" : formatDuration(live.remainingMs)) : "…"}</Stat>
              <Stat label="Distance left">
                {live ? formatDistance((1 - live.fraction) * shipment.route.distanceM) : "…"}
                <span className="block text-xs font-normal text-slate-600">of {formatDistance(shipment.route.distanceM)}</span>
              </Stat>
            </dl>
          </Card>

          <Card className="order-4">
            <CardHeader title="Timeline" description="Every update, newest first. Internal notes are staff-only." />
            <AdminTimeline events={shipment.events} />
          </Card>
        </div>

        <div className="contents lg:block lg:space-y-6">
          <Card className="order-2">
            {mode ? (
              <ActionForm
                key={mode}
                mode={mode}
                shipment={shipment}
                live={live}
                picked={picked}
                onCancel={() => selectMode(null)}
                onDone={() => selectMode(null)}
              />
            ) : (
              <>
                <CardHeader title="Dispatch actions" description={`Signed in as ${user.name}`} />
                <ul className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-1">
                  {actions.map(({ mode: m, label, description, icon: Icon, primary }) => (
                    <li key={m}>
                      <button
                        type="button"
                        onClick={() => selectMode(m)}
                        className={clsx(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          primary
                            ? "border-brand-700 bg-brand-700 text-white hover:bg-brand-800"
                            : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden />
                        <span>
                          <span className="block text-sm font-semibold">{label}</span>
                          <span className={clsx("block text-xs", primary ? "text-brand-100" : "text-slate-600")}>{description}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <ContactsCard shipment={shipment} className="order-3" />
          <DetailsCard shipment={shipment} className="order-5" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}
