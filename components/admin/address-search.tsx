"use client";

import clsx from "clsx";
import { MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { Place } from "@/lib/types";

interface Suggestion {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * Address autocomplete (ARIA combobox) backed by the staff-only geocoding route.
 * After a pick, staff can edit the short public label customers will see.
 */
export function AddressSearch({
  id,
  label,
  value,
  onChange,
  error,
  required,
}: {
  id: string;
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  error?: string;
  required?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = (await res.json()) as { results?: Suggestion[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Address search failed.");
        setResults(body.results ?? []);
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setFetchError((err as Error).message);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function choose(s: Suggestion) {
    onChange({ label: s.label, address: s.address, lat: s.lat, lng: s.lng });
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const errorId = error ? `${id}-error` : undefined;

  if (value) {
    return (
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
            <p className="min-w-0 flex-1 text-sm text-slate-800">{value.address}</p>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                window.setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              aria-label={`Change ${label.toLowerCase()}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <label htmlFor={`${id}-label`} className="mt-3 block text-xs font-medium text-slate-700">
            Public label (shown to customers)
          </label>
          <Input
            id={`${id}-label`}
            className="mt-1"
            value={value.label}
            maxLength={120}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
          />
        </div>
        {error && (
          <p id={errorId} className="text-xs font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span className="text-red-700" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? `${id}-hint`}
          autoComplete="off"
          placeholder="Start typing an address or place"
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 3) {
              setResults([]);
              setOpen(false);
            }
          }}
          onKeyDown={onKeyDown}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        {loading && <Spinner className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />}
      </div>
      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-slate-600">
          {fetchError ?? "Type at least 3 characters, then pick a result."}
        </p>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[4.25rem] z-[1200] max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-600">No matches. Try a street, area or landmark.</li>
          ) : (
            results.map((r, i) => (
              <li
                key={`${r.lat},${r.lng},${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                onMouseEnter={() => setActive(i)}
                className={clsx("cursor-pointer px-3 py-2 text-sm", i === active ? "bg-brand-50" : "hover:bg-slate-50")}
              >
                <span className="block font-medium text-slate-900">{r.label}</span>
                <span className="block text-xs text-slate-600">{r.address}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
