import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl, SupabaseConfigError } from "./config";

const globalCache = globalThis as unknown as { __supabaseAdmin?: SupabaseClient };

/**
 * Server-only client with the secret (service_role) key. Bypasses RLS, so call
 * it only after authorize()/requireStaff() has checked the caller.
 */
export function adminDb(): SupabaseClient {
  if (!globalCache.__supabaseAdmin) {
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !key) throw new SupabaseConfigError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
    globalCache.__supabaseAdmin = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return globalCache.__supabaseAdmin;
}

type Result = { data: unknown; error: { message: string; code?: string } | null };
/** The data type of the success branch of a Supabase response union. */
type SuccessData<R extends Result> = [Extract<R, { error: null }>] extends [never] ? R["data"] : Extract<R, { error: null }>["data"];

/** Throws a plain Error for a PostgREST/Auth error (keeping its code) and returns the data otherwise. */
export function check<R extends Result>(result: R): SuccessData<R> {
  if (result.error) {
    const error = new Error(result.error.message) as Error & { code?: string };
    error.code = result.error.code;
    throw error;
  }
  return result.data as SuccessData<R>;
}
