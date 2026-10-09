/** Pure geometry helpers used when building routes (server) and fitting maps (client). */
import { cumulativeDistances, haversineM, type LatLngLike } from "./movement";

/** Maximum points stored per route. Keeps rows (and the public projection) small. */
export const MAX_ROUTE_POINTS = 500;

/** Ramer-Douglas-Peucker simplification with a tolerance in metres. Keeps both endpoints. */
export function simplifyPath<T extends LatLngLike>(points: T[], toleranceM: number): T[] {
  if (points.length <= 2) return points.slice();
  const meanLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const kx = 111_320 * Math.cos((meanLat * Math.PI) / 180);
  const ky = 110_540;
  const xy = points.map((p) => ({ x: p.lng * kx, y: p.lat * ky }));
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const tol2 = toleranceM * toleranceM;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const a = xy[first];
    const b = xy[last];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let maxDist2 = -1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const p = xy[i];
      let t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const ex = a.x + dx * t - p.x;
      const ey = a.y + dy * t - p.y;
      const d2 = ex * ex + ey * ey;
      if (d2 > maxDist2) {
        maxDist2 = d2;
        index = i;
      }
    }
    if (index !== -1 && maxDist2 > tol2) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

/** Simplify with a growing tolerance until the path has at most `maxPoints` points. */
export function simplifyToMax<T extends LatLngLike>(points: T[], maxPoints = MAX_ROUTE_POINTS, initialToleranceM = 5): T[] {
  const limit = Math.max(2, maxPoints);
  let result = dedupe(points);
  let tolerance = initialToleranceM;
  while (result.length > limit) {
    result = simplifyPath(result, tolerance);
    tolerance *= 2;
  }
  return result;
}

/** Remove consecutive points closer than `minM` metres. */
export function dedupe<T extends LatLngLike>(points: T[], minM = 0.5): T[] {
  const out: T[] = [];
  for (const p of points) {
    if (!out.length || haversineM(out[out.length - 1], p) >= minM) out.push(p);
  }
  if (points.length > 1 && out.length === 1) out.push(points[points.length - 1]);
  return out;
}

export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Normalised geometry ready to store: rounded coordinates and cumulative distances. */
export function buildGeometry(points: LatLngLike[], maxPoints = MAX_ROUTE_POINTS) {
  const simplified = simplifyToMax(points, maxPoints).map((p) => ({ lat: roundCoord(p.lat), lng: roundCoord(p.lng) }));
  const cumulative = cumulativeDistances(simplified).map((d) => Math.round(d * 10) / 10);
  return { points: simplified, cumulative, distanceM: cumulative[cumulative.length - 1] ?? 0 };
}

/** [[south, west], [north, east]] bounds for a set of points. */
export function boundsOf(points: LatLngLike[]): [[number, number], [number, number]] {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return [
    [south, west],
    [north, east],
  ];
}

/** Evenly spaced points on a straight line. Only used when no routing service is available (seed data). */
export function straightLine(a: LatLngLike, b: LatLngLike, segments = 40): LatLngLike[] {
  return Array.from({ length: segments + 1 }, (_, i) => ({
    lat: a.lat + ((b.lat - a.lat) * i) / segments,
    lng: a.lng + ((b.lng - a.lng) * i) / segments,
  }));
}
