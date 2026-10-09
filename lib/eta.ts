import { formatDateTime, formatDuration, formatRelative } from "./format";
import { effectiveState, etaMs, remainingMsAt, type Movement } from "./movement";
import type { ShipmentStatus } from "./types";

export interface EtaSummary {
  label: string;
  detail: string | null;
  kind: "eta" | "paused" | "not_started" | "due" | "delivered";
}

/** Human summary of the arrival estimate. Shared by the dashboard and the public page. */
export function etaSummary(status: ShipmentStatus, movement: Movement, now: number): EtaSummary {
  if (status === "delivered") {
    return { label: "Delivered", detail: formatDateTime(movement.anchorTime), kind: "delivered" };
  }
  const state = effectiveState(movement, now);
  if (state === "not_started") {
    return { label: "Not started", detail: `About ${formatDuration(movement.remainingMs)} once on the road`, kind: "not_started" };
  }
  if (state === "paused") {
    return { label: "Paused", detail: `${formatDuration(remainingMsAt(movement, now))} to go when it resumes`, kind: "paused" };
  }
  if (state === "arrived") {
    return { label: "Arriving now", detail: "Awaiting delivery confirmation", kind: "due" };
  }
  const eta = etaMs(movement)!;
  return { label: formatDateTime(eta), detail: formatRelative(eta, now), kind: "eta" };
}

/** Sort key for "ETA soonest first": moving shipments by ETA, then the rest. */
export function etaSortKey(status: ShipmentStatus, movement: Movement): number {
  if (status === "delivered") return Number.MAX_SAFE_INTEGER;
  return etaMs(movement) ?? Number.MAX_SAFE_INTEGER - 1;
}
