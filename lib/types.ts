/**
 * Shared domain types. All times here are epoch milliseconds; the database
 * layer converts them to/from timestamptz at the boundary.
 */
import type { Movement } from "./movement";

export const ROLES = ["admin", "dispatcher"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const SHIPMENT_STATUSES = [
  "pending",
  "in_transit",
  "paused",
  "out_for_delivery",
  "delivered",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "Pending",
  in_transit: "In transit",
  paused: "Paused",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export const UPDATE_SOURCES = ["driver_call", "dispatch", "customer_call", "office"] as const;
export type UpdateSource = (typeof UPDATE_SOURCES)[number];

export const SOURCE_LABELS: Record<UpdateSource, string> = {
  driver_call: "Driver call",
  dispatch: "Dispatch",
  customer_call: "Customer call",
  office: "Office",
};

export interface LatLng {
  lat: number;
  lng: number;
}

/** A geocoded place. `label` is the short public label; `address` is the full address (staff only). */
export interface Place extends LatLng {
  label: string;
  address: string;
}

export interface Party {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface PackageDetails {
  description: string;
  weightKg: number;
  quantity: number;
}

export interface Driver {
  name: string;
  phone: string;
}

/** Simplified driving route with cumulative distances (metres) for each point. */
export interface RouteGeometry {
  points: LatLng[];
  cumulative: number[];
  distanceM: number;
  /** Driving time reported by the routing service for the whole route, in seconds. */
  routingDurationS: number;
}

export interface Actor {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

export const EVENT_TYPES = [
  "created",
  "started",
  "paused",
  "resumed",
  "position_set",
  "eta_adjusted",
  "status_changed",
  "rerouted",
  "note",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface TimelineEvent {
  id: string;
  at: number;
  type: EventType;
  /** Customer-facing headline, e.g. "Out for delivery". */
  title: string;
  /** Shipment status after this event. */
  status: ShipmentStatus;
  source: UpdateSource;
  locationLabel: string;
  publicNote: string;
  internalNote: string;
  showToCustomer: boolean;
  by: { uid: string; name: string };
}

export interface PublicTimelineEvent {
  id: string;
  at: number;
  type: EventType;
  title: string;
  status: ShipmentStatus;
  locationLabel: string;
  note: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  version: number;
  sender: Party;
  receiver: Party;
  package: PackageDetails;
  origin: Place;
  destination: Place;
  waypoints: Place[];
  driver: Driver;
  estimatedDurationHours: number;
  route: RouteGeometry;
  status: ShipmentStatus;
  /** Status to restore when a paused shipment resumes. */
  statusBeforePause: ShipmentStatus | null;
  movement: Movement;
  events: TimelineEvent[];
  lastEvent: { at: number; title: string; locationLabel: string } | null;
  createdAt: number;
  updatedAt: number;
  createdBy: { uid: string; name: string };
}

/** Sanitized projection stored at publicTracking/{trackingNumber}. */
export interface PublicTracking {
  trackingNumber: string;
  version: number;
  status: ShipmentStatus;
  movement: Movement;
  route: Pick<RouteGeometry, "points" | "cumulative" | "distanceM">;
  origin: { label: string; lat: number; lng: number };
  destination: { label: string; lat: number; lng: number };
  timeline: PublicTimelineEvent[];
  /** Estimated arrival (ms) while moving, otherwise null. */
  etaAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** Lightweight row for the admin shipments list. */
export interface ShipmentSummary {
  id: string;
  trackingNumber: string;
  sender: { name: string; phone: string };
  receiver: { name: string; phone: string };
  originLabel: string;
  destinationLabel: string;
  status: ShipmentStatus;
  movement: Movement;
  lastEvent: Shipment["lastEvent"];
  updatedAt: number;
}

export interface StaffMember {
  uid: string;
  email: string;
  name: string;
  role: Role;
  disabled: boolean;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface ActivityEntry {
  id: string;
  at: number;
  actor: Actor;
  action: string;
  summary: string;
  shipmentId: string | null;
  trackingNumber: string | null;
  targetUid: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** Extra context, e.g. the dispatch update fields (source, notes). */
  details: Record<string, unknown> | null;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
      code?: "conflict" | "not_found";
    };
