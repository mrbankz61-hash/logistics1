/**
 * Movement model: the shipment's position is computed from an anchor, never
 * ticked by a server. Pure functions only. Shared by the admin dashboard, the
 * public tracking page and the server actions, so they always agree.
 *
 * All times are epoch milliseconds.
 */

export type MovementState = "not_started" | "moving" | "paused" | "arrived";

export interface Movement {
  state: MovementState;
  /** Progress along the route (0..1) at anchorTime. */
  anchorFraction: number;
  anchorTime: number;
  /** Time from anchorTime to the destination. */
  remainingMs: number;
}

export interface LatLngLike {
  lat: number;
  lng: number;
}

export const HOUR_MS = 3_600_000;

export function hoursToMs(hours: number): number {
  return Math.round(hours * HOUR_MS);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampFraction(fraction: number): number {
  return Number.isFinite(fraction) ? clamp(fraction, 0, 1) : 0;
}

// ---------------------------------------------------------------------------
// Time -> progress
// ---------------------------------------------------------------------------

/** Progress along the route (0..1) at `now`. */
export function currentFraction(m: Movement, now: number): number {
  switch (m.state) {
    case "arrived":
      return 1;
    case "moving": {
      const anchor = clampFraction(m.anchorFraction);
      if (m.remainingMs <= 0) return 1;
      const t = clamp((now - m.anchorTime) / m.remainingMs, 0, 1);
      return anchor + (1 - anchor) * t;
    }
    default:
      return clampFraction(m.anchorFraction);
  }
}

/** Time left until the destination at `now`. Frozen while paused or not started. */
export function remainingMsAt(m: Movement, now: number): number {
  switch (m.state) {
    case "arrived":
      return 0;
    case "moving":
      return Math.max(0, m.anchorTime + m.remainingMs - now);
    default:
      return Math.max(0, m.remainingMs);
  }
}

/** Estimated arrival time while moving; null when paused, not started or arrived. */
export function etaMs(m: Movement): number | null {
  return m.state === "moving" ? m.anchorTime + Math.max(0, m.remainingMs) : null;
}

/** State as a viewer should see it: a "moving" shipment that reached the end is "arrived". */
export function effectiveState(m: Movement, now: number): MovementState {
  if (m.state === "moving" && currentFraction(m, now) >= 1) return "arrived";
  return m.state;
}

export function progressPercent(fraction: number): number {
  return Math.round(clampFraction(fraction) * 100);
}

// ---------------------------------------------------------------------------
// Transitions (each returns a new Movement)
// ---------------------------------------------------------------------------

export function initialMovement(now: number, durationMs: number): Movement {
  return { state: "not_started", anchorFraction: 0, anchorTime: now, remainingMs: Math.max(0, durationMs) };
}

/** Collapse a "moving" movement that has reached the destination into "arrived". */
export function normalize(m: Movement, now: number): Movement {
  if (m.state === "moving" && currentFraction(m, now) >= 1) {
    return {
      state: "arrived",
      anchorFraction: 1,
      anchorTime: Math.min(now, m.anchorTime + Math.max(0, m.remainingMs)),
      remainingMs: 0,
    };
  }
  return m;
}

/** Begin moving from the current fraction (0 for a new shipment) over `remainingMs`. */
export function start(m: Movement, now: number, remainingMs: number = m.remainingMs): Movement {
  return {
    state: "moving",
    anchorFraction: currentFraction(m, now),
    anchorTime: now,
    remainingMs: Math.max(0, remainingMs),
  };
}

/** Freeze at the current fraction and remember the time that was left. */
export function pause(m: Movement, now: number): Movement {
  return {
    state: "paused",
    anchorFraction: currentFraction(m, now),
    anchorTime: now,
    remainingMs: remainingMsAt(m, now),
  };
}

/** Continue from the paused fraction with the time that was left at pause. */
export function resume(m: Movement, now: number): Movement {
  return {
    state: "moving",
    anchorFraction: clampFraction(m.anchorFraction),
    anchorTime: now,
    remainingMs: Math.max(0, m.remainingMs),
  };
}

/** Place the shipment at `fraction` with `remainingMs` to go. */
export function setPosition(
  now: number,
  fraction: number,
  remainingMs: number,
  state: Extract<MovementState, "moving" | "paused" | "not_started"> = "moving",
): Movement {
  const f = clampFraction(fraction);
  if (f >= 1) return arrive(now);
  return { state, anchorFraction: f, anchorTime: now, remainingMs: Math.max(0, remainingMs) };
}

/** Change the time left to the destination, keeping the current position. */
export function adjustEta(m: Movement, now: number, remainingMs: number): Movement {
  if (m.state === "arrived") return m;
  return {
    state: m.state,
    anchorFraction: currentFraction(m, now),
    anchorTime: now,
    remainingMs: Math.max(0, remainingMs),
  };
}

export function arrive(now: number): Movement {
  return { state: "arrived", anchorFraction: 1, anchorTime: now, remainingMs: 0 };
}

// ---------------------------------------------------------------------------
// Route geometry
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineM(a: LatLngLike, b: LatLngLike): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cumulative distance (metres) from the first point to each point. */
export function cumulativeDistances(points: LatLngLike[]): number[] {
  const out: number[] = [];
  let total = 0;
  points.forEach((p, i) => {
    if (i > 0) total += haversineM(points[i - 1], p);
    out.push(total);
  });
  return out;
}

/** Index i of the segment [i, i+1] containing distance `target`, via binary search. */
export function findSegment(cumulative: number[], target: number): number {
  const last = cumulative.length - 1;
  if (last < 1) return 0;
  if (target <= cumulative[0]) return 0;
  if (target >= cumulative[last]) return last - 1;
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

export interface RoutePosition extends LatLngLike {
  /** Index of the route point at the start of the containing segment. */
  index: number;
}

/** Convert a fraction of the route's length to a coordinate. */
export function positionAtFraction(
  points: LatLngLike[],
  cumulative: number[],
  fraction: number,
): RoutePosition {
  if (points.length === 0) throw new Error("Route has no points");
  if (points.length === 1) return { lat: points[0].lat, lng: points[0].lng, index: 0 };
  const total = cumulative[cumulative.length - 1];
  if (!(total > 0)) return { lat: points[0].lat, lng: points[0].lng, index: 0 };

  const target = clampFraction(fraction) * total;
  const i = findSegment(cumulative, target);
  const segLen = cumulative[i + 1] - cumulative[i];
  const t = segLen > 0 ? clamp((target - cumulative[i]) / segLen, 0, 1) : 0;
  const a = points[i];
  const b = points[i + 1];
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, index: i };
}

export interface SnapResult extends LatLngLike {
  fraction: number;
  /** Distance from the clicked point to the route, in metres. */
  distanceM: number;
  index: number;
}

/** Snap an arbitrary point to the nearest point on the route. */
export function snapToRoute(points: LatLngLike[], cumulative: number[], p: LatLngLike): SnapResult {
  if (points.length === 0) throw new Error("Route has no points");
  const total = cumulative[cumulative.length - 1];
  if (points.length === 1 || !(total > 0)) {
    return { lat: points[0].lat, lng: points[0].lng, fraction: 0, distanceM: haversineM(points[0], p), index: 0 };
  }

  // Local equirectangular projection (metres) centred on p. Accurate enough at route scale.
  const kx = toRad(1) * EARTH_RADIUS_M * Math.cos(toRad(p.lat));
  const ky = toRad(1) * EARTH_RADIUS_M;
  const project = (q: LatLngLike) => ({ x: (q.lng - p.lng) * kx, y: (q.lat - p.lat) * ky });

  let best = { dist2: Infinity, index: 0, t: 0 };
  let a = project(points[0]);
  for (let i = 0; i < points.length - 1; i++) {
    const b = project(points[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? clamp(-(a.x * dx + a.y * dy) / len2, 0, 1) : 0;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    const dist2 = cx * cx + cy * cy;
    if (dist2 < best.dist2) best = { dist2, index: i, t };
    a = b;
  }

  const { index, t } = best;
  const pa = points[index];
  const pb = points[index + 1];
  const along = cumulative[index] + (cumulative[index + 1] - cumulative[index]) * t;
  return {
    lat: pa.lat + (pb.lat - pa.lat) * t,
    lng: pa.lng + (pb.lng - pa.lng) * t,
    fraction: clampFraction(along / total),
    distanceM: Math.sqrt(best.dist2),
    index,
  };
}

/** Split the route at `fraction` into the travelled part and the part still to go. */
export function splitRoute(
  points: LatLngLike[],
  cumulative: number[],
  fraction: number,
): { travelled: LatLngLike[]; remaining: LatLngLike[]; current: RoutePosition } {
  const current = positionAtFraction(points, cumulative, fraction);
  const here = { lat: current.lat, lng: current.lng };
  return {
    travelled: [...points.slice(0, current.index + 1), here],
    remaining: [here, ...points.slice(current.index + 1)],
    current,
  };
}
