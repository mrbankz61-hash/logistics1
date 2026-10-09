import { describe, expect, it } from "vitest";
import { boundsOf, buildGeometry, dedupe, simplifyPath, simplifyToMax, straightLine } from "./geo";
import { cumulativeDistances } from "./movement";

describe("simplification", () => {
  it("drops collinear points and keeps the endpoints", () => {
    const pts = straightLine({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, 50);
    const simplified = simplifyPath(pts, 1);
    expect(simplified).toHaveLength(2);
    expect(simplified[0]).toEqual(pts[0]);
    expect(simplified[1]).toEqual(pts[pts.length - 1]);
  });

  it("keeps corners that exceed the tolerance", () => {
    const pts = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.5 },
      { lat: 0, lng: 1 },
      { lat: 0.5, lng: 1 },
      { lat: 1, lng: 1 },
    ];
    expect(simplifyPath(pts, 10)).toEqual([pts[0], pts[2], pts[4]]);
  });

  it("simplifyToMax respects the point budget on a wiggly path", () => {
    const wiggly = Array.from({ length: 3000 }, (_, i) => ({
      lat: Math.sin(i / 7) * 0.01,
      lng: i * 0.001,
    }));
    const out = simplifyToMax(wiggly, 200);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out[0]).toEqual(wiggly[0]);
    expect(out[out.length - 1]).toEqual(wiggly[wiggly.length - 1]);
  });

  it("dedupe removes repeated points but keeps at least two", () => {
    const p = { lat: 1, lng: 1 };
    expect(dedupe([p, { ...p }, { lat: 1, lng: 1.01 }])).toHaveLength(2);
    expect(dedupe([p, { ...p }])).toHaveLength(2);
  });
});

describe("buildGeometry", () => {
  it("returns rounded points with matching cumulative distances", () => {
    const g = buildGeometry([
      { lat: 6.5243793, lng: 3.3792057 },
      { lat: 6.6018, lng: 3.3515 },
      { lat: 7.3775, lng: 3.947 },
    ]);
    expect(g.points[0]).toEqual({ lat: 6.524379, lng: 3.379206 });
    expect(g.cumulative).toHaveLength(g.points.length);
    expect(g.cumulative[0]).toBe(0);
    expect(g.distanceM).toBe(g.cumulative[g.cumulative.length - 1]);
    expect(g.distanceM).toBeCloseTo(cumulativeDistances(g.points)[2], 0);
  });
});

describe("boundsOf", () => {
  it("returns south-west and north-east corners", () => {
    expect(
      boundsOf([
        { lat: 2, lng: -1 },
        { lat: -3, lng: 4 },
      ]),
    ).toEqual([
      [-3, -1],
      [2, 4],
    ]);
  });
});
