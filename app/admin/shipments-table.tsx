"use client";

import clsx from "clsx";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Card, EmptyState } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { etaSortKey, etaSummary } from "@/lib/eta";
import { formatRelative } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { SHIPMENT_STATUSES, STATUS_LABELS, type ShipmentStatus, type ShipmentSummary } from "@/lib/types";

type SortKey = "created" | "eta" | "updated";

const digits = (s: string) => s.replace(/\D/g, "");

function matches(row: ShipmentSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qDigits = digits(q);
  const haystack = [row.trackingNumber, row.receiver.name, row.sender.name, row.originLabel, row.destinationLabel]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q) || haystack.replace(/-/g, "").includes(q.replace(/[-\s]/g, ""))) return true;
  return qDigits.length >= 4 && [row.receiver.phone, row.sender.phone].some((p) => digits(p).includes(qDigits));
}

export function ShipmentsTable({ rows }: { rows: ShipmentSummary[] }) {
  const now = useNow(30_000);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ShipmentStatus | "all" | "active">("active");
  const [sort, setSort] = useState<SortKey>("created");

  const visible = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        (status === "all" || (status === "active" ? r.status !== "delivered" : r.status === status)) && matches(r, query),
    );
    if (sort === "eta") return [...filtered].sort((a, b) => etaSortKey(a.status, a.movement) - etaSortKey(b.status, b.movement));
    if (sort === "updated") return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
    return filtered; // server order: newest first
  }, [rows, query, status, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="shipment-search" className="mb-1.5 block text-sm font-medium text-slate-800">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              id="shipment-search"
              type="search"
              placeholder="Tracking number, name or phone"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <div>
            <label htmlFor="status-filter" className="mb-1.5 block text-sm font-medium text-slate-800">
              Status
            </label>
            <Select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="md:w-48">
              <option value="active">Active (not delivered)</option>
              <option value="all">All statuses</option>
              {SHIPMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]} ({counts[s] ?? 0})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="sort" className="mb-1.5 block text-sm font-medium text-slate-800">
              Sort by
            </label>
            <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="md:w-44">
              <option value="created">Newest first</option>
              <option value="eta">ETA (soonest)</option>
              <option value="updated">Last update</option>
            </Select>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600" aria-live="polite">
        Showing {visible.length} of {rows.length} shipments
      </p>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState title={rows.length === 0 ? "No shipments yet" : "No shipments match"}>
            {rows.length === 0 ? (
              <Link href="/admin/shipments/new" className="font-semibold text-brand-700 hover:underline">
                Create the first shipment
              </Link>
            ) : (
              "Try a different search or status filter."
            )}
          </EmptyState>
        ) : (
          <>
            {/* Table on larger screens */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">Tracking #</th>
                    <th scope="col" className="px-4 py-3">Receiver</th>
                    <th scope="col" className="px-4 py-3">Route</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">ETA</th>
                    <th scope="col" className="px-4 py-3">Last update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-[13px] font-semibold whitespace-nowrap">
                        <Link href={`/admin/shipments/${row.id}`} className="text-brand-700 hover:underline">
                          {row.trackingNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{row.receiver.name}</div>
                        <div className="text-xs text-slate-600">{row.receiver.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex flex-wrap items-center gap-1">
                          {row.originLabel}
                          <ArrowRight className="size-3.5 text-slate-500" aria-label="to" />
                          {row.destinationLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <EtaCell row={row} now={now} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.lastEvent ? (
                          <>
                            <div className="max-w-[16rem] truncate">{row.lastEvent.locationLabel}</div>
                            <div className="text-xs text-slate-600">{now ? formatRelative(row.lastEvent.at, now) : " "}</div>
                          </>
                        ) : (
                          "None"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on phones */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {visible.map((row) => (
                <li key={row.id}>
                  <Link href={`/admin/shipments/${row.id}`} className="block px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[13px] font-semibold text-brand-700">{row.trackingNumber}</span>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">{row.receiver.name}</p>
                    <p className="text-sm text-slate-600">
                      {row.originLabel} → {row.destinationLabel}
                    </p>
                    <div className="mt-1 text-xs">
                      <EtaCell row={row} now={now} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function EtaCell({ row, now }: { row: ShipmentSummary; now: number | null }) {
  if (now === null) return <span className="text-slate-500">…</span>;
  const eta = etaSummary(row.status, row.movement, now);
  return (
    <span className="block">
      <span className={clsx("font-medium", eta.kind === "eta" ? "text-slate-900" : eta.kind === "due" ? "text-amber-800" : "text-slate-600")}>
        {eta.label}
      </span>
      {eta.kind === "eta" && <span className="block text-xs text-slate-600">{eta.detail}</span>}
    </span>
  );
}
