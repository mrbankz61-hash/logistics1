import { EyeOff, Lock } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { SOURCE_LABELS, type TimelineEvent } from "@/lib/types";

/** Full staff timeline, including internal notes and who recorded each update. */
export function AdminTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <EmptyState title="No updates yet" />;
  const ordered = [...events].reverse();
  return (
    <ol className="divide-y divide-slate-100">
      {ordered.map((event) => (
        <li key={event.id} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-semibold text-slate-900">{event.title}</p>
            <StatusBadge status={event.status} />
            {!event.showToCustomer && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                <EyeOff className="size-3" aria-hidden />
                Hidden from customer
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-700">
            <LocalTime ms={event.at} /> · {event.locationLabel}
          </p>
          <p className="text-xs text-slate-600">
            {SOURCE_LABELS[event.source]} · recorded by {event.by.name}
          </p>
          {event.publicNote && (
            <p className="mt-2 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-950">
              <span className="font-medium">Customer note:</span> {event.publicNote}
            </p>
          )}
          {event.internalNote && (
            <p className="mt-2 flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">Internal:</span> {event.internalNote}
              </span>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
