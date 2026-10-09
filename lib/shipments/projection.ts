/**
 * The public projection of a shipment. Fields are whitelisted explicitly:
 * no phone numbers, emails, full addresses, driver details or internal notes.
 */
import { etaMs } from "@/lib/movement";
import type { PublicTracking, Shipment, ShipmentSummary } from "@/lib/types";

export function toPublicTracking(s: Shipment): PublicTracking {
  return {
    trackingNumber: s.trackingNumber,
    version: s.version,
    status: s.status,
    movement: {
      state: s.movement.state,
      anchorFraction: s.movement.anchorFraction,
      anchorTime: s.movement.anchorTime,
      remainingMs: s.movement.remainingMs,
    },
    route: {
      points: s.route.points.map(({ lat, lng }) => ({ lat, lng })),
      cumulative: s.route.cumulative.slice(),
      distanceM: s.route.distanceM,
    },
    origin: { label: s.origin.label, lat: s.origin.lat, lng: s.origin.lng },
    destination: { label: s.destination.label, lat: s.destination.lat, lng: s.destination.lng },
    timeline: s.events
      .filter((e) => e.showToCustomer)
      .map((e) => ({
        id: e.id,
        at: e.at,
        type: e.type,
        title: e.title,
        status: e.status,
        locationLabel: e.locationLabel,
        note: e.publicNote,
      })),
    etaAt: etaMs(s.movement),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function toSummary(s: Shipment): ShipmentSummary {
  return {
    id: s.id,
    trackingNumber: s.trackingNumber,
    sender: { name: s.sender.name, phone: s.sender.phone },
    receiver: { name: s.receiver.name, phone: s.receiver.phone },
    originLabel: s.origin.label,
    destinationLabel: s.destination.label,
    status: s.status,
    movement: s.movement,
    lastEvent: s.lastEvent,
    updatedAt: s.updatedAt,
  };
}
