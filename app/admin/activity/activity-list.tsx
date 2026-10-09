"use client";

import Link from "next/link";
import { LocalTime, useHydrated } from "@/components/local-time";
import { formatDateTime } from "@/lib/format";
import type { ActivityEntry } from "@/lib/types";

const TIME_KEYS = new Set(["etaAt", "at", "lastLoginAt", "createdAt"]);

function show(key: string, value: unknown, hydrated: boolean): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && TIME_KEYS.has(key)) return hydrated ? formatDateTime(value) : new Date(value).toISOString();
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ChangeTable({ before, after }: { before: ActivityEntry["before"]; after: ActivityEntry["after"] }) {
  const hydrated = useHydrated();
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  if (keys.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="mt-2 w-full min-w-[28rem] text-left text-xs">
        <thead className="text-slate-600">
          <tr>
            <th scope="col" className="py-1 pr-3 font-medium">Field</th>
            <th scope="col" className="py-1 pr-3 font-medium">Before</th>
            <th scope="col" className="py-1 font-medium">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {keys.map((key) => {
            const b = show(key, before?.[key], hydrated);
            const a = show(key, after?.[key], hydrated);
            return (
              <tr key={key} className={b !== a ? "bg-amber-50/60" : undefined}>
                <th scope="row" className="py-1 pr-3 font-mono font-normal text-slate-700">{key}</th>
                <td className="py-1 pr-3 text-slate-700">{b}</td>
                <td className="py-1 font-medium text-slate-900">{a}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  const hydrated = useHydrated();
  return (
    <ol className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <li key={entry.id} className="px-5 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm font-medium text-slate-900">{entry.summary}</p>
            <LocalTime ms={entry.at} className="text-xs whitespace-nowrap text-slate-600" />
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            {entry.actor.name} ({entry.actor.role}) · <span className="font-mono">{entry.action}</span>
            {entry.shipmentId && entry.trackingNumber && (
              <>
                {" · "}
                <Link href={`/admin/shipments/${entry.shipmentId}`} className="font-mono text-brand-700 hover:underline">
                  {entry.trackingNumber}
                </Link>
              </>
            )}
          </p>
          {(entry.before || entry.after || entry.details) && (
            <details className="mt-2 rounded-md border border-slate-200 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">Details</summary>
              <ChangeTable before={entry.before} after={entry.after} />
              {entry.details && (
                <dl className="mt-2 grid gap-x-3 gap-y-1 text-xs sm:grid-cols-[9rem_1fr]">
                  {Object.entries(entry.details).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-mono text-slate-600">{k}</dt>
                      <dd className="text-slate-900">{show(k, v, hydrated)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}
