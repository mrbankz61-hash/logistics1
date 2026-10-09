/**
 * Pure state transitions for dispatch actions. The server runs these inside a
 * single database commit; keeping them pure makes every rule unit-testable.
 */
import {
  adjustEta,
  arrive,
  HOUR_MS,
  hoursToMs,
  initialMovement,
  normalize,
  pause,
  resume,
  setPosition,
  snapToRoute,
  start,
  type Movement,
} from "@/lib/movement";
import { UserError } from "@/lib/errors";
import { STATUS_LABELS, type EventType, type Place, type RouteGeometry, type Shipment, type ShipmentStatus, type TimelineEvent } from "@/lib/types";
import type { ShipmentAction, UpdateFields } from "@/lib/validation";

export type ShipmentState = Pick<
  Shipment,
  "status" | "statusBeforePause" | "movement" | "route" | "estimatedDurationHours" | "destination" | "waypoints"
>;

export interface ReducerContext {
  now: number;
  eventId: string;
  by: { uid: string; name: string };
}

export interface ReducerResult {
  patch: Partial<ShipmentState>;
  event: TimelineEvent;
  /** Short description for the activity log. */
  summary: string;
}

const STATUS_TITLES: Record<ShipmentStatus, string> = {
  pending: "Awaiting pickup",
  in_transit: "In transit",
  paused: "Shipment paused",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

function makeEvent(
  type: EventType,
  title: string,
  status: ShipmentStatus,
  update: UpdateFields,
  ctx: ReducerContext,
): TimelineEvent {
  return {
    id: ctx.eventId,
    at: ctx.now,
    type,
    title,
    status,
    source: update.source,
    locationLabel: update.locationLabel,
    publicNote: update.publicNote,
    internalNote: update.internalNote,
    showToCustomer: update.showToCustomer,
    by: ctx.by,
  };
}

export function applyShipmentAction(
  state: ShipmentState,
  action: ShipmentAction,
  update: UpdateFields,
  ctx: ReducerContext,
): ReducerResult {
  const { now } = ctx;
  const m0 = normalize(state.movement, now);
  let movement: Movement = m0;
  let status = state.status;
  let statusBeforePause = state.statusBeforePause;
  const extra: Partial<ShipmentState> = {};
  let type: EventType;
  let title: string;
  let summary: string;

  switch (action.type) {
    case "start": {
      if (m0.state !== "not_started") {
        throw new UserError("This shipment has already started. Use Resume, Set position or Adjust ETA instead.");
      }
      movement = start(m0, now, hoursToMs(action.remainingHours));
      status = "in_transit";
      statusBeforePause = null;
      extra.estimatedDurationHours = action.remainingHours;
      type = "started";
      title = "Picked up and on the way";
      summary = `Started movement (${action.remainingHours} h to destination)`;
      break;
    }
    case "pause": {
      if (m0.state !== "moving") throw new UserError("Only a moving shipment can be paused.");
      movement = pause(m0, now);
      statusBeforePause = state.status === "paused" ? "in_transit" : state.status;
      status = "paused";
      type = "paused";
      title = STATUS_TITLES.paused;
      summary = "Paused movement";
      break;
    }
    case "resume": {
      if (m0.state !== "paused") throw new UserError("Only a paused shipment can be resumed.");
      movement = resume(m0, now);
      status = state.statusBeforePause ?? "in_transit";
      statusBeforePause = null;
      type = "resumed";
      title = "Back on the move";
      summary = "Resumed movement";
      break;
    }
    case "set_position": {
      // Re-snap on the server: never trust a client-computed fraction.
      const snap = snapToRoute(state.route.points, state.route.cumulative, action);
      movement = setPosition(now, snap.fraction, hoursToMs(action.remainingHours), "moving");
      if (state.status === "pending" || state.status === "paused" || state.status === "delivered") {
        status = state.status === "paused" ? (state.statusBeforePause ?? "in_transit") : "in_transit";
      }
      statusBeforePause = null;
      type = "position_set";
      title = "Location updated";
      summary = `Set position to ${Math.round(snap.fraction * 100)}% of route, ${action.remainingHours} h remaining`;
      break;
    }
    case "adjust_eta": {
      if (m0.state === "arrived") throw new UserError("This shipment has already arrived. Use Set position to move it back onto the route.");
      const ms = hoursToMs(action.remainingHours);
      if (m0.state === "not_started") {
        movement = { ...m0, remainingMs: ms };
        extra.estimatedDurationHours = action.remainingHours;
      } else {
        movement = adjustEta(m0, now, ms);
      }
      type = "eta_adjusted";
      title = "Arrival estimate updated";
      summary = `Adjusted remaining time to ${action.remainingHours} h`;
      break;
    }
    case "change_status": {
      const target = action.status;
      if (target === state.status) throw new UserError(`The shipment is already “${STATUS_LABELS[target]}”.`);
      switch (target) {
        case "pending":
          movement = initialMovement(now, hoursToMs(state.estimatedDurationHours));
          break;
        case "paused":
          if (m0.state !== "moving") throw new UserError("Only a moving shipment can be paused.");
          movement = pause(m0, now);
          statusBeforePause = state.status;
          break;
        case "in_transit":
        case "out_for_delivery":
          if (m0.state === "not_started") movement = start(m0, now);
          else if (m0.state === "paused") movement = resume(m0, now);
          else if (m0.state === "arrived" && state.status === "delivered") {
            throw new UserError("To move a delivered shipment back onto the route, use Set position.");
          }
          break;
        case "delivered":
          movement = arrive(now);
          break;
      }
      if (target !== "paused") statusBeforePause = null;
      status = target;
      type = "status_changed";
      title = STATUS_TITLES[target];
      summary = `Changed status from ${STATUS_LABELS[state.status]} to ${STATUS_LABELS[target]}`;
      break;
    }
    case "note": {
      type = "note";
      title = "Shipment update";
      summary = "Logged an update";
      break;
    }
  }

  return {
    patch: { ...extra, movement, status, statusBeforePause },
    event: makeEvent(type, title, status, update, ctx),
    summary,
  };
}

export interface RerouteInput {
  route: RouteGeometry;
  /** Fraction of the new route already travelled (where the new leg begins). */
  junctionFraction: number;
  destination: Place | null;
  waypoint: Place | null;
  remainingMs: number;
}

export function applyReroute(
  state: ShipmentState,
  input: RerouteInput,
  update: UpdateFields,
  ctx: ReducerContext,
): ReducerResult {
  if (state.status === "delivered") throw new UserError("This shipment has been delivered and can't be re-routed.");
  const { now } = ctx;
  const m0 = normalize(state.movement, now);
  const extra: Partial<ShipmentState> = {};
  let movement: Movement;

  if (m0.state === "not_started") {
    movement = initialMovement(now, input.remainingMs);
    extra.estimatedDurationHours = Math.round((input.remainingMs / HOUR_MS) * 100) / 100;
  } else {
    movement = setPosition(now, input.junctionFraction, input.remainingMs, m0.state === "paused" ? "paused" : "moving");
  }

  const changes = [
    input.destination ? `destination to ${input.destination.label}` : null,
    input.waypoint ? `waypoint via ${input.waypoint.label}` : null,
  ].filter(Boolean);

  const patch: Partial<ShipmentState> = {
    ...extra,
    movement,
    route: input.route,
    destination: input.destination ?? state.destination,
    waypoints: input.waypoint ? [...state.waypoints, input.waypoint] : state.waypoints,
  };

  return {
    patch,
    event: makeEvent("rerouted", "Route updated", state.status, update, ctx),
    summary: `Re-routed: ${changes.join(", ")}`,
  };
}
