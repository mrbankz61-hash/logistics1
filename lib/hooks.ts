"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { currentFraction, effectiveState, remainingMsAt, type Movement } from "./movement";

/**
 * Current time, refreshed every `intervalMs`. Returns null during server
 * rendering and hydration so time-dependent text never mismatches.
 */
export function useNow(intervalMs = 2000): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = window.setInterval(onChange, intervalMs);
      return () => window.clearInterval(id);
    },
    [intervalMs],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
}

let clockOffsetMs = 0;
let clockPromise: Promise<void> | null = null;

/** Difference between the server clock and this device's clock, measured once per page load. */
export function useClockOffset(): number {
  const [offset, setOffset] = useState(clockOffsetMs);
  useEffect(() => {
    let cancelled = false;
    clockPromise ??= (async () => {
      try {
        const t0 = Date.now();
        const res = await fetch("/api/time", { cache: "no-store" });
        const { now } = (await res.json()) as { now: number };
        const t1 = Date.now();
        if (Number.isFinite(now)) clockOffsetMs = now - (t0 + t1) / 2;
      } catch {
        // Fall back to the device clock.
      }
    })();
    clockPromise.then(() => {
      if (!cancelled) setOffset(clockOffsetMs);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return offset;
}

export interface LiveMovement {
  now: number;
  fraction: number;
  remainingMs: number;
  state: Movement["state"];
}

/** Live progress for a movement, recomputed every ~2 seconds on the client. */
export function useLiveMovement(movement: Movement | null | undefined, intervalMs = 2000): LiveMovement | null {
  const tick = useNow(intervalMs);
  const offset = useClockOffset();
  if (!movement || tick === null) return null;
  const now = tick + offset;
  return {
    now,
    fraction: currentFraction(movement, now),
    remainingMs: remainingMsAt(movement, now),
    state: effectiveState(movement, now),
  };
}
