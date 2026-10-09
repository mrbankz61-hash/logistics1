import { describe, expect, it } from "vitest";
import {
  adjustEta,
  arrive,
  cumulativeDistances,
  currentFraction,
  effectiveState,
  etaMs,
  findSegment,
  haversineM,
  HOUR_MS,
  initialMovement,
  normalize,
  pause,
  positionAtFraction,
  progressPercent,
  remainingMsAt,
  resume,
  setPosition,
  snapToRoute,
  splitRoute,
  start,
  type Movement,
} from "./movement";

const T0 = Date.UTC(2026, 0, 1, 8, 0, 0);

const moving = (overrides: Partial<Movement> = {}): Movement => ({
  state: "moving",
  anchorFraction: 0,
  anchorTime: T0,
  remainingMs: 10 * HOUR_MS,
  ...overrides,
});

describe("currentFraction", () => {
  it("is the anchor fraction before the shipment starts", () => {
    expect(currentFraction(initialMovement(T0, HOUR_MS), T0 + HOUR_MS)).toBe(0);
  });

  it("interpolates linearly from the anchor while moving", () => {
    const m = moving();
    expect(currentFraction(m, T0)).toBe(0);
    expect(currentFraction(m, T0 + 5 * HOUR_MS)).toBeCloseTo(0.5);
    expect(currentFraction(m, T0 + 10 * HOUR_MS)).toBe(1);
  });

  it("covers only the remaining part of the route from a non-zero anchor", () => {
    const m = moving({ anchorFraction: 0.6, remainingMs: 4 * HOUR_MS });
    // Halfway through the remaining time = 0.6 + 0.4 * 0.5
    expect(currentFraction(m, T0 + 2 * HOUR_MS)).toBeCloseTo(0.8);
  });

  it("clamps before the anchor time and after arrival", () => {
    const m = moving({ anchorFraction: 0.25 });
    expect(currentFraction(m, T0 - HOUR_MS)).toBe(0.25);
    expect(currentFraction(m, T0 + 100 * HOUR_MS)).toBe(1);
  });

  it("treats zero remaining time as arrived", () => {
    expect(currentFraction(moving({ remainingMs: 0 }), T0)).toBe(1);
  });

  it("is frozen while paused and 1 once arrived", () => {
    const paused: Movement = { state: "paused", anchorFraction: 0.4, anchorTime: T0, remainingMs: HOUR_MS };
    expect(currentFraction(paused, T0 + 50 * HOUR_MS)).toBe(0.4);
    expect(currentFraction(arrive(T0), T0)).toBe(1);
  });

  it("guards against out-of-range anchors", () => {
    expect(currentFraction({ ...moving(), state: "paused", anchorFraction: 1.7 }, T0)).toBe(1);
    expect(currentFraction({ ...moving(), state: "paused", anchorFraction: Number.NaN }, T0)).toBe(0);
  });
});

describe("transitions", () => {
  it("start begins at the current fraction with the given duration", () => {
    const m = start(initialMovement(T0, 3 * HOUR_MS), T0 + 1000, 8 * HOUR_MS);
    expect(m).toEqual({ state: "moving", anchorFraction: 0, anchorTime: T0 + 1000, remainingMs: 8 * HOUR_MS });
  });

  it("pause stores the current fraction and the time left at pause", () => {
    const p = pause(moving(), T0 + 4 * HOUR_MS);
    expect(p.state).toBe("paused");
    expect(p.anchorFraction).toBeCloseTo(0.4);
    expect(p.anchorTime).toBe(T0 + 4 * HOUR_MS);
    expect(p.remainingMs).toBe(6 * HOUR_MS);
  });

  it("resume keeps remainingMs from pause time and restarts the clock", () => {
    const p = pause(moving(), T0 + 4 * HOUR_MS);
    const resumedAt = T0 + 30 * HOUR_MS; // paused for 26 hours
    const r = resume(p, resumedAt);
    expect(r.state).toBe("moving");
    expect(r.anchorTime).toBe(resumedAt);
    expect(r.remainingMs).toBe(6 * HOUR_MS);
    expect(currentFraction(r, resumedAt)).toBeCloseTo(0.4);
    expect(currentFraction(r, resumedAt + 3 * HOUR_MS)).toBeCloseTo(0.7);
    expect(etaMs(r)).toBe(resumedAt + 6 * HOUR_MS);
  });

  it("setPosition anchors at the snapped fraction and continues from there", () => {
    const m = setPosition(T0, 0.75, 2 * HOUR_MS);
    expect(m).toEqual({ state: "moving", anchorFraction: 0.75, anchorTime: T0, remainingMs: 2 * HOUR_MS });
    expect(currentFraction(m, T0 + HOUR_MS)).toBeCloseTo(0.875);
  });

  it("setPosition at the very end means arrived", () => {
    expect(setPosition(T0, 1, HOUR_MS).state).toBe("arrived");
  });

  it("adjustEta keeps the position and changes only the time left", () => {
    const m = moving();
    const now = T0 + 5 * HOUR_MS; // 50%
    const faster = adjustEta(m, now, HOUR_MS);
    expect(faster.anchorFraction).toBeCloseTo(0.5);
    expect(faster.anchorTime).toBe(now);
    expect(etaMs(faster)).toBe(now + HOUR_MS);
    expect(currentFraction(faster, now + HOUR_MS / 2)).toBeCloseTo(0.75);
  });

  it("adjustEta while paused keeps it paused", () => {
    const p = pause(moving(), T0 + HOUR_MS);
    const adjusted = adjustEta(p, T0 + 2 * HOUR_MS, 3 * HOUR_MS);
    expect(adjusted.state).toBe("paused");
    expect(adjusted.anchorFraction).toBeCloseTo(0.1);
    expect(adjusted.remainingMs).toBe(3 * HOUR_MS);
  });

  it("normalize turns a finished movement into arrived and leaves others alone", () => {
    const done = normalize(moving({ remainingMs: HOUR_MS }), T0 + 2 * HOUR_MS);
    expect(done).toEqual({ state: "arrived", anchorFraction: 1, anchorTime: T0 + HOUR_MS, remainingMs: 0 });
    const notYet = moving();
    expect(normalize(notYet, T0 + HOUR_MS)).toBe(notYet);
  });
});

describe("eta and remaining time", () => {
  it("ETA is anchorTime + remainingMs while moving, null otherwise", () => {
    expect(etaMs(moving())).toBe(T0 + 10 * HOUR_MS);
    expect(etaMs(pause(moving(), T0 + HOUR_MS))).toBeNull();
    expect(etaMs(initialMovement(T0, HOUR_MS))).toBeNull();
    expect(etaMs(arrive(T0))).toBeNull();
  });

  it("remaining time counts down while moving and is frozen while paused", () => {
    expect(remainingMsAt(moving(), T0 + 3 * HOUR_MS)).toBe(7 * HOUR_MS);
    expect(remainingMsAt(moving(), T0 + 30 * HOUR_MS)).toBe(0);
    const p = pause(moving(), T0 + 3 * HOUR_MS);
    expect(remainingMsAt(p, T0 + 99 * HOUR_MS)).toBe(7 * HOUR_MS);
  });

  it("effectiveState reports arrival without a server tick", () => {
    expect(effectiveState(moving(), T0 + HOUR_MS)).toBe("moving");
    expect(effectiveState(moving(), T0 + 10 * HOUR_MS)).toBe("arrived");
  });

  it("progressPercent rounds and clamps", () => {
    expect(progressPercent(0.4449)).toBe(44);
    expect(progressPercent(2)).toBe(100);
  });
});

// A route along the equator: three points one degree apart (~111.2 km each).
const line = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 0, lng: 2 },
];
const lineCum = cumulativeDistances(line);

// An L-shaped route: east 1 degree, then north 1 degree.
const ell = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
];
const ellCum = cumulativeDistances(ell);

describe("route geometry", () => {
  it("haversine matches a known distance", () => {
    // London -> Paris is ~343.5 km
    const d = haversineM({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    expect(d / 1000).toBeCloseTo(343.5, 0);
  });

  it("cumulative distances start at 0 and grow", () => {
    expect(lineCum[0]).toBe(0);
    expect(lineCum[1]).toBeCloseTo(111_195, -2);
    expect(lineCum[2]).toBeCloseTo(2 * lineCum[1], 3);
  });

  it("findSegment binary-searches the containing segment", () => {
    const cum = [0, 10, 20, 30, 40];
    expect(findSegment(cum, -5)).toBe(0);
    expect(findSegment(cum, 0)).toBe(0);
    expect(findSegment(cum, 9.9)).toBe(0);
    expect(findSegment(cum, 10)).toBe(1);
    expect(findSegment(cum, 35)).toBe(3);
    expect(findSegment(cum, 40)).toBe(3);
    expect(findSegment(cum, 99)).toBe(3);
  });

  it("positionAtFraction interpolates within the right segment", () => {
    expect(positionAtFraction(line, lineCum, 0)).toMatchObject({ lat: 0, lng: 0 });
    expect(positionAtFraction(line, lineCum, 0.25).lng).toBeCloseTo(0.5, 6);
    expect(positionAtFraction(line, lineCum, 0.75).lng).toBeCloseTo(1.5, 6);
    expect(positionAtFraction(line, lineCum, 1)).toMatchObject({ lat: 0, lng: 2 });
    const corner = positionAtFraction(ell, ellCum, 0.75);
    expect(corner.lng).toBeCloseTo(1, 6);
    expect(corner.lat).toBeCloseTo(0.5, 2);
    expect(corner.index).toBe(1);
  });

  it("positionAtFraction clamps and handles degenerate routes", () => {
    expect(positionAtFraction(line, lineCum, -1)).toMatchObject({ lng: 0 });
    expect(positionAtFraction(line, lineCum, 5)).toMatchObject({ lng: 2 });
    expect(positionAtFraction([{ lat: 3, lng: 4 }], [0], 0.5)).toMatchObject({ lat: 3, lng: 4 });
    expect(() => positionAtFraction([], [], 0.5)).toThrow();
  });

  it("snapToRoute projects a point onto the nearest segment", () => {
    const snap = snapToRoute(line, lineCum, { lat: 0.2, lng: 0.5 });
    expect(snap.lat).toBeCloseTo(0, 6);
    expect(snap.lng).toBeCloseTo(0.5, 4);
    expect(snap.fraction).toBeCloseTo(0.25, 3);
    expect(snap.distanceM / 1000).toBeCloseTo(22.2, 0);
  });

  it("snapToRoute picks the closest segment on a bent route and clamps to the ends", () => {
    const nearNorthLeg = snapToRoute(ell, ellCum, { lat: 0.5, lng: 1.1 });
    expect(nearNorthLeg.index).toBe(1);
    expect(nearNorthLeg.fraction).toBeCloseTo(0.75, 2);
    expect(snapToRoute(ell, ellCum, { lat: -1, lng: -1 }).fraction).toBe(0);
    expect(snapToRoute(ell, ellCum, { lat: 5, lng: 1 }).fraction).toBe(1);
  });

  it("snap -> position round-trips", () => {
    const snap = snapToRoute(ell, ellCum, { lat: 0.3, lng: 0.9 });
    const pos = positionAtFraction(ell, ellCum, snap.fraction);
    expect(pos.lat).toBeCloseTo(snap.lat, 4);
    expect(pos.lng).toBeCloseTo(snap.lng, 4);
  });

  it("splitRoute shares the current point between both halves", () => {
    const { travelled, remaining, current } = splitRoute(ell, ellCum, 0.25);
    expect(travelled[0]).toEqual(ell[0]);
    expect(travelled[travelled.length - 1]).toEqual({ lat: current.lat, lng: current.lng });
    expect(remaining[0]).toEqual({ lat: current.lat, lng: current.lng });
    expect(remaining[remaining.length - 1]).toEqual(ell[2]);
  });
});
