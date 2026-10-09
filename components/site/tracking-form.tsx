"use client";

import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { brand } from "@/lib/brand";
import { isValidTrackingNumber, normalizeTrackingNumber } from "@/lib/tracking-number";

/** Tracking number lookup used on the home page, /track and the not-found state. */
export function TrackingForm({
  defaultValue = "",
  tone = "light",
  label = "Tracking number",
  autoFocus = false,
}: {
  defaultValue?: string;
  tone?: "light" | "dark";
  label?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const dark = tone === "dark";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tn = normalizeTrackingNumber(value);
    if (!isValidTrackingNumber(tn)) {
      setError(`Tracking numbers look like ${brand.trackingPrefix}-7KQ4M2TZ. Check the number on your receipt or message.`);
      return;
    }
    setError(null);
    router.push(`/track/${tn}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate role="search" aria-label="Track a shipment">
      <label htmlFor={id} className={clsx("mb-3 block text-sm font-medium", dark ? "text-slate-200" : "text-slate-800")}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name="tracking"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`e.g. ${brand.trackingPrefix}-7KQ4M2TZ`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(
            "h-14 w-full min-w-0 border px-4 font-mono text-base tracking-wide uppercase",
            "placeholder:font-sans placeholder:tracking-normal placeholder:normal-case",
            "focus:outline-none focus:ring-2 aria-[invalid=true]:border-accent-500",
            dark
              ? "border-white/20 bg-white/5 text-white placeholder:text-slate-400 focus:border-white/50 focus:ring-white/20"
              : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus:border-brand-600 focus:ring-brand-600/25",
          )}
        />
        <button
          type="submit"
          className={clsx(
            "flex h-14 shrink-0 flex-col items-center justify-center gap-0.5 px-7 text-base font-semibold transition-colors sm:flex-row sm:gap-3",
            dark ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-brand-600 text-white hover:bg-brand-700",
          )}
        >
          Track
          <ArrowRight className={clsx("size-4", dark ? "text-brand-600" : "text-white")} aria-hidden />
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className={clsx("mt-3 text-sm font-medium", dark ? "text-accent-300" : "text-red-700")}>
          {error}
        </p>
      )}
    </form>
  );
}
