import "server-only";
import { randomUUID } from "node:crypto";
import {
  activityToRow,
  eventToRow,
  rowToShipment,
  rowToSummary,
  shipmentToRow,
  SUMMARY_SELECT,
  type ActivityInput,
  type EventRow,
  type ShipmentRow,
  type SummaryRow,
} from "@/lib/db/rows";
import { UserError } from "@/lib/errors";
import {
  currentFraction,
  etaMs,
  HOUR_MS,
  hoursToMs,
  initialMovement,
  normalize,
  positionAtFraction,
} from "@/lib/movement";
import { toPublicTracking } from "@/lib/shipments/projection";
import { applyReroute, applyShipmentAction, type ReducerResult } from "@/lib/shipments/reducer";
import { spliceRoute, toRouteGeometry } from "@/lib/shipments/route";
import { adminDb, check } from "@/lib/supabase/admin";
import { trackingTopic } from "@/lib/supabase/config";
import { generateTrackingNumber } from "@/lib/tracking-number";
import type { Actor, Shipment, ShipmentSummary, TimelineEvent } from "@/lib/types";
import type { CreateShipmentInput, RerouteRequest, ShipmentAction, UpdateFields } from "@/lib/validation";
import { getDrivingRoute } from "./ors";

// ---------------------------------------------------------------------------
// Activity log helpers
// ---------------------------------------------------------------------------

/** Compact before/after view of a shipment for the activity log. */
function logSnapshot(s: Shipment, now: number) {
  return {
    status: s.status,
    movementState: s.movement.state,
    progressPercent: Math.round(currentFraction(s.movement, now) * 1000) / 10,
    remainingHours: Math.round((s.movement.remainingMs / HOUR_MS) * 100) / 100,
    etaAt: etaMs(s.movement),
    destination: s.destination.label,
    waypoints: s.waypoints.map((w) => w.label),
    distanceKm: Math.round(s.route.distanceM / 100) / 10,
  };
}

function updateDetails(update: UpdateFields) {
  return {
    source: update.source,
    locationLabel: update.locationLabel,
    publicNote: update.publicNote,
    internalNote: update.internalNote,
    showToCustomer: update.showToCustomer,
  };
}

/** Append one activity log entry (for changes that aren't shipment commits). */
export async function writeActivity(entry: ActivityInput) {
  check(await adminDb().from("activity_log").insert(activityToRow(entry)));
}

// ---------------------------------------------------------------------------
// Commit: shipment + new events + public projection + log, atomically
// ---------------------------------------------------------------------------

class TrackingNumberTaken extends Error {}

const conflictError = () =>
  new UserError(
    "Someone else updated this shipment a moment ago. The page has been refreshed; review it and try again.",
    undefined,
    "conflict",
  );

async function commit(next: Shipment, expectedVersion: number | null, newEvents: TimelineEvent[], log: ActivityInput) {
  const { error } = await adminDb().rpc("commit_shipment", {
    p_shipment: shipmentToRow(next),
    p_expected_version: expectedVersion,
    p_events: newEvents.map((e) => eventToRow(e, next.id)),
    p_public: toPublicTracking(next),
    p_log: activityToRow(log),
  });
  if (error) {
    if (error.message.includes("version_conflict")) throw conflictError();
    if (error.code === "23505" && expectedVersion === null) throw new TrackingNumberTaken();
    throw new Error(`commit_shipment failed: ${error.message}`);
  }
  await notifyTrackingChanged(next.trackingNumber, next.version);
}

/**
 * Tell open tracking pages (and dashboards) to refetch. Best effort: the data
 * is already committed, and pages also re-check periodically.
 */
async function notifyTrackingChanged(trackingNumber: string, version: number) {
  try {
    const db = adminDb();
    const channel = db.channel(trackingTopic(trackingNumber));
    const result = await channel.httpSend("updated", { version }, { timeout: 4000 });
    if (!result.success) console.warn("Realtime broadcast failed", result.status, result.error);
    await db.removeChannel(channel);
  } catch (error) {
    console.warn("Realtime broadcast failed", error);
  }
}

function applyResult(before: Shipment, result: ReducerResult, now: number): Shipment {
  const event = result.event;
  return {
    ...before,
    ...result.patch,
    version: before.version + 1,
    events: [...before.events, event],
    lastEvent: { at: event.at, title: event.title, locationLabel: event.locationLabel },
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listShipmentSummaries(limit = 500): Promise<ShipmentSummary[]> {
  const rows = check(
    await adminDb().from("shipments").select(SUMMARY_SELECT).order("created_at", { ascending: false }).limit(limit),
  ) as unknown as SummaryRow[];
  return rows.map(rowToSummary);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getShipment(id: string): Promise<Shipment | null> {
  if (!UUID.test(id)) return null;
  const row = check(
    await adminDb().from("shipments").select("*, shipment_events(*)").eq("id", id).maybeSingle(),
  ) as unknown as (ShipmentRow & { shipment_events: EventRow[] }) | null;
  return row ? rowToShipment(row, row.shipment_events ?? []) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createShipment(input: CreateShipmentInput, actor: Actor) {
  const driving = await getDrivingRoute([input.origin, input.destination]);
  const route = toRouteGeometry(driving.points, driving.durationS);
  const id = randomUUID();

  for (let attempt = 0; attempt < 5; attempt++) {
    const trackingNumber = generateTrackingNumber();
    const now = Date.now();
    const by = { uid: actor.uid, name: actor.name };
    const created: TimelineEvent = {
      id: randomUUID(),
      at: now,
      type: "created",
      title: "Shipment created",
      status: "pending",
      source: "office",
      locationLabel: input.origin.label,
      publicNote: "",
      internalNote: "",
      showToCustomer: true,
      by,
    };
    const shipment: Shipment = {
      id,
      trackingNumber,
      version: 1,
      sender: input.sender,
      receiver: input.receiver,
      package: input.package,
      origin: input.origin,
      destination: input.destination,
      waypoints: [],
      driver: input.driver,
      estimatedDurationHours: input.estimatedDurationHours,
      route,
      status: "pending",
      statusBeforePause: null,
      movement: initialMovement(now, hoursToMs(input.estimatedDurationHours)),
      events: [created],
      lastEvent: { at: now, title: created.title, locationLabel: created.locationLabel },
      createdAt: now,
      updatedAt: now,
      createdBy: by,
    };
    try {
      await commit(shipment, null, shipment.events, {
        actor,
        at: now,
        action: "shipment.create",
        summary: `Created shipment ${trackingNumber} (${input.origin.label} → ${input.destination.label})`,
        shipment,
        after: { ...logSnapshot(shipment, now), receiver: input.receiver.name, sender: input.sender.name },
      });
      return { id, trackingNumber };
    } catch (error) {
      if (error instanceof TrackingNumberTaken) continue;
      throw error;
    }
  }
  throw new UserError("Couldn't allocate a unique tracking number. Please try again.");
}

async function loadForUpdate(shipmentId: string, expectedVersion: number): Promise<Shipment> {
  const before = await getShipment(shipmentId);
  if (!before) throw new UserError("Shipment not found.", undefined, "not_found");
  if (before.version !== expectedVersion) throw conflictError();
  return before;
}

export async function runShipmentAction(
  shipmentId: string,
  expectedVersion: number,
  action: ShipmentAction,
  update: UpdateFields,
  actor: Actor,
): Promise<{ version: number }> {
  const before = await loadForUpdate(shipmentId, expectedVersion);
  const now = Date.now();
  const result = applyShipmentAction(before, action, update, {
    now,
    eventId: randomUUID(),
    by: { uid: actor.uid, name: actor.name },
  });
  const next = applyResult(before, result, now);
  // The database re-checks the version atomically, so a concurrent change can't be overwritten.
  await commit(next, before.version, [result.event], {
    actor,
    at: now,
    action: `shipment.${action.type}`,
    summary: `${next.trackingNumber}: ${result.summary}`,
    shipment: next,
    before: logSnapshot(before, now),
    after: logSnapshot(next, now),
    details: updateDetails(update),
  });
  return { version: next.version };
}

export async function rerouteShipment(req: RerouteRequest, actor: Actor): Promise<{ version: number }> {
  const before = await loadForUpdate(req.shipmentId, req.expectedVersion);
  if (before.status === "delivered") throw new UserError("This shipment has been delivered and can't be re-routed.");

  // Plan the new leg from where the shipment is now.
  const planAt = Date.now();
  const m0 = normalize(before.movement, planAt);
  const fraction = m0.state === "not_started" ? 0 : currentFraction(m0, planAt);
  const here = positionAtFraction(before.route.points, before.route.cumulative, fraction);
  const destination = req.destination ?? before.destination;
  const stops = [{ lat: here.lat, lng: here.lng }, ...(req.waypoint ? [req.waypoint] : []), destination];
  const leg = await getDrivingRoute(stops);
  const { route, junctionFraction } = spliceRoute(before.route, fraction, leg.points, leg.durationS);

  // Without an explicit time, scale the routing estimate by how this shipment was planned.
  let remainingMs: number;
  if (req.remainingHours !== null) {
    remainingMs = hoursToMs(req.remainingHours);
  } else {
    const plannedS = before.estimatedDurationHours * 3600;
    const scale =
      before.route.routingDurationS > 0 ? Math.min(3, Math.max(0.5, plannedS / before.route.routingDurationS)) : 1;
    remainingMs = Math.round(leg.durationS * 1000 * scale);
  }

  const now = Date.now();
  const result = applyReroute(
    before,
    { route, junctionFraction, destination: req.destination, waypoint: req.waypoint, remainingMs },
    req.update,
    { now, eventId: randomUUID(), by: { uid: actor.uid, name: actor.name } },
  );
  const next = applyResult(before, result, now);
  await commit(next, before.version, [result.event], {
    actor,
    at: now,
    action: "shipment.reroute",
    summary: `${next.trackingNumber}: ${result.summary}`,
    shipment: next,
    before: logSnapshot(before, now),
    after: logSnapshot(next, now),
    details: updateDetails(req.update),
  });
  return { version: next.version };
}

/** Replace a shipment wholesale (used by the seed script). */
export async function importShipment(shipment: Shipment, actor: Actor) {
  check(await adminDb().from("shipments").delete().eq("id", shipment.id));
  const now = Date.now();
  await commit(shipment, null, shipment.events, {
    actor,
    at: now,
    action: "shipment.seed",
    summary: `Loaded sample shipment ${shipment.trackingNumber}`,
    shipment,
    after: logSnapshot(shipment, now),
  });
}
