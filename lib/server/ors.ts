import "server-only";
import { UserError } from "@/lib/errors";
import type { LatLng } from "@/lib/types";

/**
 * OpenRouteService client (geocoding + driving directions). Server only:
 * the API key never reaches the browser.
 */
const BASE = "https://api.openrouteservice.org";
const TIMEOUT_MS = 12_000;

export interface GeocodeResult {
  /** Short public label, e.g. "Ikeja, Lagos". */
  label: string;
  /** Full address as returned by the geocoder. */
  address: string;
  lat: number;
  lng: number;
}

export interface DrivingRoute {
  points: LatLng[];
  distanceM: number;
  durationS: number;
}

function apiKey(): string {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new UserError("Routing is not configured. Add ORS_API_KEY to the server environment.");
  return key;
}

interface PeliasFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label?: string;
    name?: string;
    locality?: string;
    localadmin?: string;
    county?: string;
    region?: string;
    country?: string;
  };
}

function toResult(feature: PeliasFeature): GeocodeResult {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const place = p.locality ?? p.localadmin ?? p.county ?? p.name ?? "";
  const parts = [place, p.region].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);
  const address = p.label ?? [p.name, place, p.region, p.country].filter(Boolean).join(", ");
  return { label: parts.join(", ") || address, address, lat, lng };
}

async function orsFetch(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new UserError("The routing service didn't respond. Check the connection and try again.");
  }
  const body = (await response.json().catch(() => null)) as
    | { error?: { code?: number; message?: string } | string }
    | null;

  if (!response.ok) {
    const error = typeof body?.error === "object" ? body.error : { message: body?.error };
    if (response.status === 401 || response.status === 403) {
      throw new UserError("The routing service rejected the API key (ORS_API_KEY). Check it or your quota.");
    }
    if (response.status === 429) throw new UserError("Routing quota exceeded. Wait a minute and try again.");
    if (error?.code === 2010) {
      throw new UserError("Couldn't find a road near one of the locations. Pick a point closer to a road.");
    }
    if (error?.code === 2004) throw new UserError("That route is too long for the routing service.");
    if (error?.code === 2009) throw new UserError("No driving route exists between those locations.");
    console.error("ORS error", response.status, body);
    throw new UserError(error?.message ? `Routing failed: ${error.message}` : "Routing failed. Please try again.");
  }
  return body;
}

function countryFilter(): string {
  const countries = process.env.ORS_GEOCODE_COUNTRY?.trim();
  return countries ? `&boundary.country=${encodeURIComponent(countries)}` : "";
}

export async function geocodeAutocomplete(text: string): Promise<GeocodeResult[]> {
  const query = `text=${encodeURIComponent(text)}${countryFilter()}`;
  const body = (await orsFetch(`/geocode/autocomplete?api_key=${apiKey()}&${query}`)) as { features?: PeliasFeature[] };
  return (body.features ?? []).slice(0, 6).map(toResult);
}

export async function reverseGeocode(point: LatLng): Promise<GeocodeResult | null> {
  const query = `point.lat=${point.lat}&point.lon=${point.lng}&size=1`;
  const body = (await orsFetch(`/geocode/reverse?api_key=${apiKey()}&${query}`)) as { features?: PeliasFeature[] };
  const first = body.features?.[0];
  return first ? toResult(first) : null;
}

/** Driving route through the given points (2 or more), in order. */
export async function getDrivingRoute(stops: LatLng[]): Promise<DrivingRoute> {
  if (stops.length < 2) throw new UserError("A route needs at least two locations.");
  const body = (await orsFetch("/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: {
      Authorization: apiKey(),
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json",
    },
    body: JSON.stringify({
      coordinates: stops.map((s) => [s.lng, s.lat]),
      radiuses: stops.map(() => 1500),
      instructions: false,
    }),
  })) as {
    features?: Array<{
      geometry: { coordinates: [number, number][] };
      properties: { summary?: { distance?: number; duration?: number } };
    }>;
  };

  const feature = body.features?.[0];
  if (!feature || feature.geometry.coordinates.length < 2) {
    throw new UserError("No driving route exists between those locations.");
  }
  return {
    points: feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceM: feature.properties.summary?.distance ?? 0,
    durationS: feature.properties.summary?.duration ?? 0,
  };
}
