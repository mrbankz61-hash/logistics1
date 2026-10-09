import { describe, expect, it } from "vitest";
import { currentFraction, etaMs, HOUR_MS, positionAtFraction } from "@/lib/movement";
import type { UpdateFields } from "@/lib/validation";
import { makeShipment, T0 } from "./fixtures";
import { applyReroute, applyShipmentAction, type ShipmentState } from "./reducer";
import { spliceRoute } from "./route";

const update: UpdateFields = {
  source: "driver_call",
  locationLabel: "Highway junction",
  publicNote: "",
  internalNote: "",
  showToCustomer: true,
};
const ctx = (now: number) => ({ now, eventId: "evt", by: { uid: "u1", name: "Dispatcher" } });

function apply(state: ShipmentState, action: Parameters<typeof applyShipmentAction>[1], now: number) {
  const result = applyShipmentAction(state, action, update, ctx(now));
  return { ...state, ...result.patch, result };
}

describe("applyShipmentAction", () => {
  it("start -> pause -> resume keeps progress and remaining time", () => {
    let s: ShipmentState = makeShipment();
    s = apply(s, { type: "start", remainingHours: 10 }, T0);
    expect(s.status).toBe("in_transit");
    expect(s.movement.state).toBe("moving");

    const paused = apply(s, { type: "pause" }, T0 + 4 * HOUR_MS);
    expect(paused.status).toBe("paused");
    expect(paused.statusBeforePause).toBe("in_transit");
    expect(paused.movement.remainingMs).toBe(6 * HOUR_MS);
    expect(currentFraction(paused.movement, T0 + 20 * HOUR_MS)).toBeCloseTo(0.4);

    const resumed = apply(paused, { type: "resume" }, T0 + 20 * HOUR_MS);
    expect(resumed.status).toBe("in_transit");
    expect(resumed.statusBeforePause).toBeNull();
    expect(etaMs(resumed.movement)).toBe(T0 + 26 * HOUR_MS);
  });

  it("resume restores Out for delivery when that was the status before pausing", () => {
    let s: ShipmentState = apply(makeShipment(), { type: "start", remainingHours: 10 }, T0);
    s = apply(s, { type: "change_status", status: "out_for_delivery" }, T0 + HOUR_MS);
    s = apply(s, { type: "pause" }, T0 + 2 * HOUR_MS);
    s = apply(s, { type: "resume" }, T0 + 3 * HOUR_MS);
    expect(s.status).toBe("out_for_delivery");
  });

  it("rejects invalid transitions with a clear message", () => {
    const s = makeShipment();
    expect(() => apply(s, { type: "pause" }, T0)).toThrow(/Only a moving shipment/);
    expect(() => apply(s, { type: "resume" }, T0)).toThrow(/Only a paused shipment/);
    const started = apply(s, { type: "start", remainingHours: 5 }, T0);
    expect(() => apply(started, { type: "start", remainingHours: 5 }, T0)).toThrow(/already started/);
    expect(() => apply(started, { type: "change_status", status: "in_transit" }, T0)).toThrow(/already/);
  });

  it("set_position snaps on the server and continues from there", () => {
    const started = apply(makeShipment(), { type: "start", remainingHours: 10 }, T0);
    // A point beside the second leg; should snap to 75%.
    const s = apply(started, { type: "set_position", lat: 0.5, lng: 1.2, remainingHours: 2 }, T0 + HOUR_MS);
    expect(s.movement.state).toBe("moving");
    expect(s.movement.anchorFraction).toBeCloseTo(0.75, 2);
    expect(s.movement.remainingMs).toBe(2 * HOUR_MS);
    expect(etaMs(s.movement)).toBe(T0 + 3 * HOUR_MS);
  });

  it("set_position on a pending shipment starts it", () => {
    const s = apply(makeShipment(), { type: "set_position", lat: 0, lng: 0.5, remainingHours: 3 }, T0);
    expect(s.status).toBe("in_transit");
    expect(s.movement.state).toBe("moving");
  });

  it("adjust_eta changes time left but not position", () => {
    const started = apply(makeShipment(), { type: "start", remainingHours: 10 }, T0);
    const now = T0 + 5 * HOUR_MS;
    const s = apply(started, { type: "adjust_eta", remainingHours: 1 }, now);
    expect(s.movement.anchorFraction).toBeCloseTo(0.5);
    expect(etaMs(s.movement)).toBe(now + HOUR_MS);
    expect(s.status).toBe("in_transit");
  });

  it("adjust_eta before start updates the planned duration", () => {
    const s = apply(makeShipment(), { type: "adjust_eta", remainingHours: 6 }, T0);
    expect(s.movement.state).toBe("not_started");
    expect(s.movement.remainingMs).toBe(6 * HOUR_MS);
    expect(s.estimatedDurationHours).toBe(6);
  });

  it("delivered snaps the marker to the destination", () => {
    const started = apply(makeShipment(), { type: "start", remainingHours: 10 }, T0);
    const s = apply(started, { type: "change_status", status: "delivered" }, T0 + 2 * HOUR_MS);
    expect(s.movement).toEqual({ state: "arrived", anchorFraction: 1, anchorTime: T0 + 2 * HOUR_MS, remainingMs: 0 });
    expect(s.result.event.title).toBe("Delivered");
    expect(() => apply(s, { type: "change_status", status: "in_transit" }, T0 + 3 * HOUR_MS)).toThrow(/Set position/);
  });

  it("an elapsed moving shipment is normalised to arrived before the action applies", () => {
    const started = apply(makeShipment(), { type: "start", remainingHours: 1 }, T0);
    expect(() => apply(started, { type: "pause" }, T0 + 2 * HOUR_MS)).toThrow(/Only a moving shipment/);
  });

  it("records the update fields on the timeline event", () => {
    const { result } = apply(makeShipment(), { type: "note" }, T0);
    expect(result.event).toMatchObject({
      type: "note",
      source: "driver_call",
      locationLabel: "Highway junction",
      showToCustomer: true,
      by: { uid: "u1", name: "Dispatcher" },
      at: T0,
    });
  });
});

describe("re-routing", () => {
  it("keeps the travelled part and anchors at the junction so the marker doesn't jump", () => {
    const started = apply(makeShipment(), { type: "start", remainingHours: 10 }, T0);
    const now = T0 + 2.5 * HOUR_MS; // 25% = halfway along the first leg (lng 0.5)
    const f = currentFraction(started.movement, now);
    const newLeg = [
      { lat: 0, lng: 0.5 },
      { lat: -1, lng: 0.5 },
    ];
    const { route, junctionFraction } = spliceRoute(started.route, f, newLeg, 3600);
    const result = applyReroute(
      started,
      {
        route,
        junctionFraction,
        destination: { label: "New Town", address: "1 New Street", lat: -1, lng: 0.5 },
        waypoint: null,
        remainingMs: 2 * HOUR_MS,
      },
      update,
      ctx(now),
    );
    expect(result.patch.destination?.label).toBe("New Town");
    expect(result.patch.movement?.state).toBe("moving");
    // 0.5 degrees travelled out of 1.5 degrees total.
    expect(result.patch.movement?.anchorFraction).toBeCloseTo(1 / 3, 3);
    const here = positionAtFraction(route.points, route.cumulative, result.patch.movement!.anchorFraction);
    expect(here.lat).toBeCloseTo(0, 4);
    expect(here.lng).toBeCloseTo(0.5, 4);
    expect(etaMs(result.patch.movement!)).toBe(now + 2 * HOUR_MS);
    expect(route.points[0]).toEqual({ lat: 0, lng: 0 });
    expect(route.points[route.points.length - 1]).toEqual({ lat: -1, lng: 0.5 });
    expect(result.event.type).toBe("rerouted");
  });

  it("refuses to re-route a delivered shipment", () => {
    const s = makeShipment({ status: "delivered" });
    expect(() =>
      applyReroute(s, { route: s.route, junctionFraction: 1, destination: null, waypoint: null, remainingMs: 0 }, update, ctx(T0)),
    ).toThrow(/delivered/);
  });
});
