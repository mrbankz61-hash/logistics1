/**
 * Mapping between app types (camelCase, epoch ms) and Postgres rows
 * (snake_case, timestamptz). Pure, so the SQL tests use the same encoders.
 */
import type { MovementState } from "@/lib/movement";
import type {
  ActivityEntry,
  Actor,
  Driver,
  PackageDetails,
  Party,
  Place,
  RouteGeometry,
  Shipment,
  ShipmentStatus,
  ShipmentSummary,
  StaffMember,
  TimelineEvent,
} from "@/lib/types";

type Time = string | number | Date;

/** timestamptz arrives as an ISO string (PostgREST) or a Date (node drivers). */
export function toMs(value: Time): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return Date.parse(value);
}

export const toIso = (ms: number) => new Date(ms).toISOString();

export interface ShipmentRow {
  id: string;
  tracking_number: string;
  version: number;
  status: ShipmentStatus;
  status_before_pause: ShipmentStatus | null;
  sender: Party;
  receiver: Party;
  package: PackageDetails;
  origin: Place;
  destination: Place;
  waypoints: Place[];
  driver: Driver;
  estimated_duration_hours: number;
  route: RouteGeometry;
  movement_state: MovementState;
  anchor_fraction: number;
  anchor_time: Time;
  remaining_ms: number | string;
  last_event: Shipment["lastEvent"];
  created_at: Time;
  updated_at: Time;
  created_by: { uid: string; name: string };
}

export interface EventRow {
  id: string;
  shipment_id: string;
  at: Time;
  type: TimelineEvent["type"];
  title: string;
  status: ShipmentStatus;
  source: TimelineEvent["source"];
  location_label: string;
  public_note: string;
  internal_note: string;
  show_to_customer: boolean;
  by_uid: string;
  by_name: string;
}

export function shipmentToRow(s: Shipment): ShipmentRow {
  return {
    id: s.id,
    tracking_number: s.trackingNumber,
    version: s.version,
    status: s.status,
    status_before_pause: s.statusBeforePause,
    sender: s.sender,
    receiver: s.receiver,
    package: s.package,
    origin: s.origin,
    destination: s.destination,
    waypoints: s.waypoints,
    driver: s.driver,
    estimated_duration_hours: s.estimatedDurationHours,
    route: s.route,
    movement_state: s.movement.state,
    anchor_fraction: s.movement.anchorFraction,
    anchor_time: toIso(s.movement.anchorTime),
    remaining_ms: Math.round(s.movement.remainingMs),
    last_event: s.lastEvent,
    created_at: toIso(s.createdAt),
    updated_at: toIso(s.updatedAt),
    created_by: s.createdBy,
  };
}

export function eventToRow(e: TimelineEvent, shipmentId: string): EventRow {
  return {
    id: e.id,
    shipment_id: shipmentId,
    at: toIso(e.at),
    type: e.type,
    title: e.title,
    status: e.status,
    source: e.source,
    location_label: e.locationLabel,
    public_note: e.publicNote,
    internal_note: e.internalNote,
    show_to_customer: e.showToCustomer,
    by_uid: e.by.uid,
    by_name: e.by.name,
  };
}

export function rowToEvent(r: EventRow): TimelineEvent {
  return {
    id: r.id,
    at: toMs(r.at),
    type: r.type,
    title: r.title,
    status: r.status,
    source: r.source,
    locationLabel: r.location_label,
    publicNote: r.public_note,
    internalNote: r.internal_note,
    showToCustomer: r.show_to_customer,
    by: { uid: r.by_uid, name: r.by_name },
  };
}

export function rowToShipment(r: ShipmentRow, events: EventRow[]): Shipment {
  return {
    id: r.id,
    trackingNumber: r.tracking_number,
    version: r.version,
    sender: r.sender,
    receiver: r.receiver,
    package: r.package,
    origin: r.origin,
    destination: r.destination,
    waypoints: r.waypoints ?? [],
    driver: r.driver,
    estimatedDurationHours: Number(r.estimated_duration_hours),
    route: r.route,
    status: r.status,
    statusBeforePause: r.status_before_pause,
    movement: {
      state: r.movement_state,
      anchorFraction: Number(r.anchor_fraction),
      anchorTime: toMs(r.anchor_time),
      remainingMs: Number(r.remaining_ms),
    },
    events: events.map(rowToEvent).sort((a, b) => a.at - b.at),
    lastEvent: r.last_event,
    createdAt: toMs(r.created_at),
    updatedAt: toMs(r.updated_at),
    createdBy: r.created_by,
  };
}

/** Columns for the shipments list: only what the table shows. */
export const SUMMARY_SELECT =
  "id, tracking_number, sender_name:sender->>name, sender_phone:sender->>phone, receiver_name:receiver->>name, " +
  "receiver_phone:receiver->>phone, origin_label:origin->>label, destination_label:destination->>label, status, " +
  "movement_state, anchor_fraction, anchor_time, remaining_ms, last_event, updated_at";

export interface SummaryRow {
  id: string;
  tracking_number: string;
  sender_name: string | null;
  sender_phone: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  origin_label: string | null;
  destination_label: string | null;
  status: ShipmentStatus;
  movement_state: MovementState;
  anchor_fraction: number;
  anchor_time: Time;
  remaining_ms: number | string;
  last_event: Shipment["lastEvent"];
  updated_at: Time;
}

export function rowToSummary(r: SummaryRow): ShipmentSummary {
  return {
    id: r.id,
    trackingNumber: r.tracking_number,
    sender: { name: r.sender_name ?? "", phone: r.sender_phone ?? "" },
    receiver: { name: r.receiver_name ?? "", phone: r.receiver_phone ?? "" },
    originLabel: r.origin_label ?? "",
    destinationLabel: r.destination_label ?? "",
    status: r.status,
    movement: {
      state: r.movement_state,
      anchorFraction: Number(r.anchor_fraction),
      anchorTime: toMs(r.anchor_time),
      remainingMs: Number(r.remaining_ms),
    },
    lastEvent: r.last_event,
    updatedAt: toMs(r.updated_at),
  };
}

export interface ActivityRow {
  id?: string;
  at: Time;
  actor: Actor;
  action: string;
  summary: string;
  shipment_id: string | null;
  tracking_number: string | null;
  target_uid: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
}

export interface ActivityInput {
  actor: Actor;
  action: string;
  summary: string;
  at: number;
  shipment?: Pick<Shipment, "id" | "trackingNumber">;
  targetUid?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
}

export function activityToRow(entry: ActivityInput): ActivityRow {
  return {
    at: toIso(entry.at),
    actor: { uid: entry.actor.uid, name: entry.actor.name, email: entry.actor.email, role: entry.actor.role },
    action: entry.action,
    summary: entry.summary,
    shipment_id: entry.shipment?.id ?? null,
    tracking_number: entry.shipment?.trackingNumber ?? null,
    target_uid: entry.targetUid ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    details: entry.details ?? null,
  };
}

export function rowToActivity(r: ActivityRow): ActivityEntry {
  return {
    id: r.id ?? "",
    at: toMs(r.at),
    actor: r.actor,
    action: r.action,
    summary: r.summary,
    shipmentId: r.shipment_id,
    trackingNumber: r.tracking_number,
    targetUid: r.target_uid,
    before: r.before,
    after: r.after,
    details: r.details,
  };
}

export interface StaffRow {
  id: string;
  email: string;
  name: string;
  role: StaffMember["role"];
  disabled: boolean;
  created_at: Time;
  last_login_at: Time | null;
}

export function rowToStaff(r: StaffRow): StaffMember {
  return {
    uid: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    disabled: r.disabled,
    createdAt: toMs(r.created_at),
    lastLoginAt: r.last_login_at ? toMs(r.last_login_at) : null,
  };
}
