"use client";

import dynamic from "next/dynamic";
import type { RouteMapProps } from "./route-map";

export type { MapPlace, RouteMapProps } from "./route-map";

function MapPlaceholder() {
  return (
    <div className="flex h-full min-h-64 w-full animate-pulse items-center justify-center bg-slate-100 text-sm text-slate-600">
      Loading map…
    </div>
  );
}

// Leaflet touches `window` on import, so the map only renders in the browser.
const LazyRouteMap = dynamic(() => import("./route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: MapPlaceholder,
});

/** Route map with an accessible label. The text around it carries the same information. */
export function RouteMap({ label, ...props }: RouteMapProps & { label: string }) {
  return (
    <div role="region" aria-label={label} className="relative isolate overflow-hidden">
      <LazyRouteMap {...props} />
    </div>
  );
}
