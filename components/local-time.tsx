"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatDateTime } from "@/lib/format";

const noopSubscribe = () => () => {};

/** False during server rendering and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * A timestamp in the viewer's own time zone. Rendered after hydration so the
 * server's time zone (UTC on Vercel) never leaks into the page.
 */
export function LocalTime({ ms, format = "datetime", className }: { ms: number; format?: "datetime" | "date"; className?: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={new Date(ms).toISOString()} className={className}>
      {hydrated ? (format === "date" ? formatDate(ms) : formatDateTime(ms)) : " "}
    </time>
  );
}
