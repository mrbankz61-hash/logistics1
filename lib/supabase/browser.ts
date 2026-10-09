"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl, SupabaseConfigError } from "./config";

let client: SupabaseClient | null = null;

/**
 * Anonymous browser client for the public tracking page: one RPC to read a
 * single tracking projection, plus a Realtime channel for live updates.
 * Staff never authenticate through it.
 */
export function browserClient(): SupabaseClient {
  if (!isSupabaseConfigured) throw new SupabaseConfigError();
  client ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
