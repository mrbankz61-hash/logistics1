import "server-only";
import { rowToActivity, type ActivityRow } from "@/lib/db/rows";
import { adminDb, check } from "@/lib/supabase/admin";
import type { ActivityEntry } from "@/lib/types";

/** Newest first. `before` is the raw timestamp cursor returned as nextCursor. */
export async function listActivity({
  trackingNumber,
  before,
  limit = 50,
}: {
  trackingNumber?: string;
  before?: string;
  limit?: number;
}): Promise<{ entries: ActivityEntry[]; nextCursor: string | null }> {
  let query = adminDb().from("activity_log").select("*").order("at", { ascending: false }).limit(limit + 1);
  if (trackingNumber) query = query.eq("tracking_number", trackingNumber);
  if (before) query = query.lt("at", before);
  const rows = check(await query) as ActivityRow[];

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  return {
    entries: page.map(rowToActivity),
    // Keep the database's full-precision timestamp so no entries are skipped.
    nextCursor: hasMore ? String(page[page.length - 1].at) : null,
  };
}
