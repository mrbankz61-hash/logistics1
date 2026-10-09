import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { geocodeAutocomplete, reverseGeocode } from "@/lib/server/ors";

const searchSchema = z.object({ q: z.string().trim().min(3).max(200) });
const reverseSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

/**
 * Staff-only address search for the dashboard.
 *   GET /api/geocode?q=12 Main Street        -> { results: GeocodeResult[] }
 *   GET /api/geocode?lat=6.52&lng=3.37       -> { result: GeocodeResult | null }
 */
export async function GET(request: NextRequest) {
  try {
    await authorize();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  try {
    if (params.q !== undefined) {
      const parsed = searchSchema.safeParse(params);
      if (!parsed.success) return NextResponse.json({ results: [] });
      return NextResponse.json({ results: await geocodeAutocomplete(parsed.data.q) });
    }
    const parsed = reverseSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: "Provide q, or lat and lng." }, { status: 400 });
    return NextResponse.json({ result: await reverseGeocode(parsed.data) });
  } catch (error) {
    if (error instanceof UserError) return NextResponse.json({ error: error.message }, { status: 502 });
    console.error("Geocoding failed", error);
    return NextResponse.json({ error: "Address search failed." }, { status: 500 });
  }
}
