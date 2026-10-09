"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { boundsOf } from "@/lib/geo";
import { positionAtFraction, splitRoute, type LatLngLike } from "@/lib/movement";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface MapPlace extends LatLngLike {
  label: string;
}

export interface RouteMapProps {
  route: { points: LatLngLike[]; cumulative: number[] };
  origin: MapPlace;
  destination: MapPlace;
  waypoints?: MapPlace[];
  /** Progress along the route (0..1). Omit to hide the vehicle marker (e.g. a route preview). */
  fraction?: number | null;
  /** Pulse the vehicle marker while moving. */
  moving?: boolean;
  /** Let the user click the map to choose a point. */
  pickMode?: boolean;
  onPick?: (point: LatLngLike) => void;
  pickedPoint?: LatLngLike | null;
  className?: string;
}

const pinIcon = (variant: string, size = 28) =>
  L.divIcon({
    className: "",
    html: `<div class="map-pin map-pin--${variant}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [size / 2, 0],
  });

const TRUCK_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

const vehicleIcon = (moving: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="map-vehicle ${moving ? "" : "map-vehicle--still"}">${TRUCK_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    tooltipAnchor: [18, 0],
  });

export function RouteMap({
  route,
  origin,
  destination,
  waypoints = [],
  fraction = null,
  moving = false,
  pickMode = false,
  onPick,
  pickedPoint,
  className,
}: RouteMapProps) {
  const icons = useMemo(
    () => ({
      origin: pinIcon("origin"),
      destination: pinIcon("destination"),
      waypoint: pinIcon("waypoint", 18),
      pick: pinIcon("pick"),
      vehicleMoving: vehicleIcon(true),
      vehicleStill: vehicleIcon(false),
    }),
    [],
  );

  const hasRoute = route.points.length >= 2;
  const split = useMemo(
    () => (hasRoute && fraction !== null ? splitRoute(route.points, route.cumulative, fraction) : null),
    [hasRoute, route.points, route.cumulative, fraction],
  );
  const routeKey = hasRoute
    ? `${route.points.length}:${route.points[0].lat}:${route.points[route.points.length - 1].lng}`
    : `${origin.lat}:${destination.lat}`;

  return (
    <MapContainer
      className={className ?? "h-80 w-full"}
      center={[origin.lat, origin.lng]}
      zoom={8}
      scrollWheelZoom={false}
      attributionControl
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <FitBounds routeKey={routeKey} points={hasRoute ? route.points : [origin, destination]} />
      {pickMode && onPick && <PickHandler onPick={onPick} />}

      {hasRoute && split ? (
        <>
          <Polyline positions={toTuples(split.remaining)} pathOptions={{ color: "#64748b", weight: 5, opacity: 0.7, dashArray: "2 10", lineCap: "round" }} />
          <Polyline positions={toTuples(split.travelled)} pathOptions={{ color: "#2f2dff", weight: 6, opacity: 0.95 }} />
        </>
      ) : (
        hasRoute && <Polyline positions={toTuples(route.points)} pathOptions={{ color: "#2f2dff", weight: 5, opacity: 0.85 }} />
      )}

      <Marker position={[origin.lat, origin.lng]} icon={icons.origin} title={`Origin: ${origin.label}`} alt={`Origin: ${origin.label}`}>
        <Tooltip>From: {origin.label}</Tooltip>
      </Marker>
      {waypoints.map((w, i) => (
        <Marker key={`${w.lat},${w.lng},${i}`} position={[w.lat, w.lng]} icon={icons.waypoint} title={`Via: ${w.label}`} alt={`Via: ${w.label}`}>
          <Tooltip>Via: {w.label}</Tooltip>
        </Marker>
      ))}
      <Marker
        position={[destination.lat, destination.lng]}
        icon={icons.destination}
        title={`Destination: ${destination.label}`}
        alt={`Destination: ${destination.label}`}
      >
        <Tooltip>To: {destination.label}</Tooltip>
      </Marker>

      {hasRoute && fraction !== null && (
        <VehicleMarker route={route} fraction={fraction} moving={moving} icon={moving ? icons.vehicleMoving : icons.vehicleStill} />
      )}
      {pickedPoint && (
        <Marker position={[pickedPoint.lat, pickedPoint.lng]} icon={icons.pick} title="Selected point" alt="Selected point">
          <Tooltip permanent direction="top">
            New position
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}

function toTuples(points: LatLngLike[]): [number, number][] {
  return points.map((p) => [p.lat, p.lng]);
}

/** Fit the view when the route itself changes, not on every position update (the user may have panned). */
function FitBounds({ routeKey, points }: { routeKey: string; points: LatLngLike[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(boundsOf(points), { padding: [36, 36], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routeKey identifies the route
  }, [map, routeKey]);
  return null;
}

function PickHandler({ onPick }: { onPick: (p: LatLngLike) => void }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    el.classList.add("pick-mode");
    return () => el.classList.remove("pick-mode");
  }, [map]);
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

/**
 * The vehicle marker glides along the route between updates: it animates
 * the fraction (not the coordinates), so it follows the road around corners.
 */
function VehicleMarker({
  route,
  fraction,
  moving,
  icon,
}: {
  route: { points: LatLngLike[]; cumulative: number[] };
  fraction: number;
  moving: boolean;
  icon: L.DivIcon;
}) {
  const markerRef = useRef<L.Marker>(null);
  const shownRef = useRef(fraction);
  // Stable initial position; afterwards the animation moves the marker directly.
  const [initial] = useState(() => {
    const p = positionAtFraction(route.points, route.cumulative, fraction);
    return [p.lat, p.lng] as [number, number];
  });

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const from = shownRef.current;
    const to = fraction;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const place = (f: number) => {
      shownRef.current = f;
      const p = positionAtFraction(route.points, route.cumulative, f);
      marker.setLatLng([p.lat, p.lng]);
    };
    if (reduceMotion || Math.abs(to - from) < 1e-7) {
      place(to);
      return;
    }
    const duration = Math.abs(to - from) > 0.02 ? 1200 : 1800;
    const startTime = performance.now();
    let frame = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - startTime) / duration);
      const eased = 1 - (1 - k) * (1 - k);
      place(from + (to - from) * eased);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [fraction, route]);

  return (
    <Marker
      ref={markerRef}
      position={initial}
      icon={icon}
      zIndexOffset={1000}
      title="Estimated current position"
      alt="Estimated current position"
    >
      <Tooltip>{moving ? "Estimated position (moving)" : "Estimated position"}</Tooltip>
    </Marker>
  );
}
