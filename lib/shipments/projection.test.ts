import { describe, expect, it } from "vitest";
import { HOUR_MS } from "@/lib/movement";
import { makeShipment, T0 } from "./fixtures";
import { toPublicTracking } from "./projection";

describe("toPublicTracking", () => {
  const shipment = makeShipment({
    movement: { state: "moving", anchorFraction: 0.2, anchorTime: T0, remainingMs: 5 * HOUR_MS },
    events: [
      ...makeShipment().events,
      {
        id: "e1",
        at: T0 + HOUR_MS,
        type: "note",
        title: "Shipment update",
        status: "in_transit",
        source: "office",
        locationLabel: "Depot",
        publicNote: "",
        internalNote: "Driver phoned from a private number",
        showToCustomer: false,
        by: { uid: "u2", name: "Staff Two" },
      },
    ],
  });
  const projection = toPublicTracking(shipment);
  const json = JSON.stringify(projection);

  it("never contains contact details, addresses, driver info or internal notes", () => {
    for (const secret of [
      shipment.sender.phone,
      shipment.sender.email,
      shipment.sender.address,
      shipment.receiver.name,
      shipment.receiver.phone,
      shipment.receiver.email,
      shipment.receiver.address,
      shipment.driver.name,
      shipment.driver.phone,
      "gate code",
      "private number",
      "Office Staff",
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(Object.keys(projection).sort()).toEqual(
      [
        "createdAt",
        "destination",
        "etaAt",
        "movement",
        "origin",
        "route",
        "status",
        "timeline",
        "trackingNumber",
        "updatedAt",
        "version",
      ].sort(),
    );
  });

  it("includes only customer-visible timeline events, with the public note", () => {
    expect(projection.timeline).toHaveLength(1);
    expect(projection.timeline[0]).toEqual({
      id: "e0",
      at: T0,
      type: "created",
      title: "Shipment created",
      status: "pending",
      locationLabel: "Origin City",
      note: "We've got your shipment details.",
    });
  });

  it("carries the route, labels and ETA needed to draw the map", () => {
    expect(projection.route.points).toEqual(shipment.route.points);
    expect(projection.route.cumulative).toEqual(shipment.route.cumulative);
    expect(projection.origin).toEqual({ label: "Origin City", lat: 0, lng: 0 });
    expect(projection.etaAt).toBe(T0 + 5 * HOUR_MS);
  });
});
