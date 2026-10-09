/** Public Supabase settings (safe in the browser). Accepts the legacy "anon" key name too. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export class SupabaseConfigError extends Error {
  constructor(what = "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
    super(`Supabase is not configured. Set ${what} (see .env.example).`);
    this.name = "SupabaseConfigError";
  }
}

/** Realtime broadcast topic for a shipment's public tracking updates. */
export const trackingTopic = (trackingNumber: string) => `tracking:${trackingNumber}`;

/**
 * Auth cookie settings. httpOnly because nothing in the browser reads the staff
 * session: sign-in, sign-out and session checks all happen on the server.
 */
export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
