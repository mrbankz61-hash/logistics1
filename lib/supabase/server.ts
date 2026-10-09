import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions, isSupabaseConfigured, supabasePublishableKey, supabaseUrl, SupabaseConfigError } from "./config";

/**
 * Supabase client bound to the visitor's auth cookies. Used only for auth
 * (sign in/out, reading the session). Data access uses the admin client after
 * the session has been checked.
 */
export async function createSessionClient() {
  // Read cookies first: it marks the caller as request-time (never prerendered).
  const cookieStore = await cookies();
  if (!isSupabaseConfigured) throw new SupabaseConfigError();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which can't set cookies.
          // proxy.ts refreshes the session cookies on every dashboard request.
        }
      },
    },
  });
}
