"use client";

import { useEffect, useState } from "react";
import { browserClient } from "./supabase/browser";
import { isSupabaseConfigured, trackingTopic } from "./supabase/config";
import { isValidTrackingNumber } from "./tracking-number";
import type { PublicTracking } from "./types";

/** Safety net in case the Realtime connection drops silently. */
const POLL_MS = 60_000;

/**
 * Live view of one public tracking projection. Reads it with the
 * get_public_tracking() function (one row by exact number; the table itself
 * can't be listed) and refetches whenever the server broadcasts a change on
 * the shipment's Realtime channel.
 */
export function subscribePublicTracking(
  trackingNumber: string,
  onData: (data: PublicTracking | null) => void,
  onError: (error: Error) => void,
): () => void {
  const supabase = browserClient();
  let cancelled = false;
  let lastVersion: number | null | undefined;

  const load = async () => {
    const { data, error } = await supabase.rpc("get_public_tracking", { p_tracking_number: trackingNumber });
    if (cancelled) return;
    if (error) return onError(new Error(error.message));
    const doc = (data as PublicTracking | null) ?? null;
    const version = doc?.version ?? null;
    if (version !== lastVersion) {
      lastVersion = version;
      onData(doc);
    }
  };

  const channel = supabase
    .channel(trackingTopic(trackingNumber))
    .on("broadcast", { event: "updated" }, () => void load())
    .subscribe((status) => {
      // Refetch once subscribed so nothing between the first read and the subscription is missed.
      if (status === "SUBSCRIBED") void load();
    });

  const onVisible = () => document.visibilityState === "visible" && void load();
  document.addEventListener("visibilitychange", onVisible);
  const timer = window.setInterval(() => void load(), POLL_MS);
  void load();

  return () => {
    cancelled = true;
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    void supabase.removeChannel(channel);
  };
}

export type TrackingState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PublicTracking };

/** Live public tracking data; updates without a page refresh. */
export function usePublicTracking(trackingNumber: string): TrackingState {
  const valid = isValidTrackingNumber(trackingNumber);
  const [state, setState] = useState<{ key: string; value: TrackingState }>({
    key: trackingNumber,
    value: { status: "loading" },
  });

  useEffect(() => {
    if (!valid || !isSupabaseConfigured) return;
    return subscribePublicTracking(
      trackingNumber,
      (data) => setState({ key: trackingNumber, value: data ? { status: "ready", data } : { status: "not_found" } }),
      (error) => {
        console.error("Tracking lookup failed", error);
        setState((current) =>
          // Keep showing data we already have; only surface errors before the first load.
          current.key === trackingNumber && current.value.status === "ready"
            ? current
            : {
                key: trackingNumber,
                value: { status: "error", message: "We couldn't load live tracking right now. Please try again shortly." },
              },
        );
      },
    );
  }, [trackingNumber, valid]);

  if (!valid) return { status: "not_found" };
  if (!isSupabaseConfigured) return { status: "error", message: "Tracking is not configured yet." };
  return state.key === trackingNumber ? state.value : { status: "loading" };
}
