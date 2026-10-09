/** Test fixtures. Not imported by app code. */
import { cumulativeDistances, HOUR_MS, initialMovement } from "@/lib/movement";
import type { Shipment } from "@/lib/types";

export const T0 = Date.UTC(2026, 0, 1, 8, 0, 0);

const points = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
];
const cumulative = cumulativeDistances(points);

export function makeShipment(overrides: Partial<Shipment> = {}): Shipment {
  return {
    id: "ship_1",
    trackingNumber: "XXX-ABCD2345",
    version: 1,
    sender: { name: "Ada Sender", phone: "+111 555 0101", email: "ada@example.com", address: "1 Sender Road, Origin City" },
    receiver: { name: "Ben Receiver", phone: "+222 555 0202", email: "ben@example.com", address: "9 Receiver Avenue, Destination Town" },
    package: { description: "Laptop", weightKg: 2.5, quantity: 1 },
    origin: { label: "Origin City", address: "1 Sender Road, Origin City", lat: 0, lng: 0 },
    destination: { label: "Destination Town", address: "9 Receiver Avenue, Destination Town", lat: 1, lng: 1 },
    waypoints: [],
    driver: { name: "Dee Driver", phone: "+333 555 0303" },
    estimatedDurationHours: 10,
    route: { points, cumulative, distanceM: cumulative[2], routingDurationS: 8 * 3600 },
    status: "pending",
    statusBeforePause: null,
    movement: initialMovement(T0, 10 * HOUR_MS),
    events: [
      {
        id: "e0",
        at: T0,
        type: "created",
        title: "Shipment created",
        status: "pending",
        source: "office",
        locationLabel: "Origin City",
        publicNote: "We've got your shipment details.",
        internalNote: "Customer prefers morning calls; gate code 4321",
        showToCustomer: true,
        by: { uid: "u1", name: "Office Staff" },
      },
    ],
    lastEvent: { at: T0, title: "Shipment created", locationLabel: "Origin City" },
    createdAt: T0,
    updatedAt: T0,
    createdBy: { uid: "u1", name: "Office Staff" },
    ...overrides,
  };
}
