/** Pure helpers that turn routing-service output into stored RouteGeometry. */
import { buildGeometry, dedupe, MAX_ROUTE_POINTS, simplifyToMax } from "@/lib/geo";
import { splitRoute, type LatLngLike } from "@/lib/movement";
import type { RouteGeometry } from "@/lib/types";

export function toRouteGeometry(points: LatLngLike[], routingDurationS: number): RouteGeometry {
  return { ...buildGeometry(points), routingDurationS: Math.round(routingDurationS) };
}

/**
 * Keep the part of `old` already travelled (up to `fraction`) and append a new
 * leg that starts at the current position. Returns the new geometry and the
 * fraction of it where the new leg begins, so the marker doesn't jump.
 */
export function spliceRoute(
  old: RouteGeometry,
  fraction: number,
  newLeg: LatLngLike[],
  newLegDurationS: number,
): { route: RouteGeometry; junctionFraction: number } {
  if (newLeg.length < 2) throw new Error("New route leg needs at least two points");

  const { travelled } = splitRoute(old.points, old.cumulative, fraction);
  const travelledBudget = Math.floor(MAX_ROUTE_POINTS / 2);
  const kept = fraction > 0 ? simplifyToMax(dedupe(travelled), travelledBudget) : [travelled[0]];
  const leg = simplifyToMax(newLeg, MAX_ROUTE_POINTS - kept.length);

  // `kept` is already de-duplicated and the total fits the budget, so the
  // junction stays at index kept.length - 1 in the stored geometry.
  const geometry = buildGeometry(dedupe([...kept, ...leg]), MAX_ROUTE_POINTS);
  const junctionDistance = geometry.cumulative[kept.length - 1] ?? 0;
  const junctionFraction = geometry.distanceM > 0 ? Math.min(1, junctionDistance / geometry.distanceM) : 0;

  return {
    route: {
      ...geometry,
      routingDurationS: Math.round(old.routingDurationS * fraction + newLegDurationS),
    },
    junctionFraction,
  };
}
