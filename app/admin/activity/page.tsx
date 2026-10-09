import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/spinner";
import { requireStaff } from "@/lib/auth/session";
import { listActivity } from "@/lib/server/activity";
import { normalizeTrackingNumber } from "@/lib/tracking-number";
import { ActivityList } from "./activity-list";

export const metadata: Metadata = { title: "Activity log" };

export default function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Activity log</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every staff action, newest first. Entries can&apos;t be edited or deleted.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ActivityContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ActivityContent({ searchParams }: { searchParams: PageProps<"/admin/activity">["searchParams"] }) {
  const user = await requireStaff();
  if (user.role !== "admin") return <NoAccess />;

  const params = await searchParams;
  const tnRaw = typeof params.tn === "string" ? params.tn : "";
  const trackingNumber = tnRaw ? normalizeTrackingNumber(tnRaw) : undefined;
  const before =
    typeof params.before === "string" && params.before.length < 40 && !Number.isNaN(Date.parse(params.before))
      ? params.before
      : undefined;
  const { entries, nextCursor } = await listActivity({ trackingNumber, before });

  const nextHref = nextCursor
    ? `/admin/activity?${new URLSearchParams({ ...(trackingNumber ? { tn: trackingNumber } : {}), before: nextCursor })}`
    : null;

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end" role="search">
        <div className="sm:w-72">
          <label htmlFor="tn" className="mb-1.5 block text-sm font-medium text-slate-800">
            Filter by tracking number
          </label>
          <Input id="tn" name="tn" defaultValue={trackingNumber ?? ""} placeholder="e.g. XXX-7KQ4M2TZ" />
        </div>
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Filter
        </button>
        {(trackingNumber || before) && (
          <Link href="/admin/activity" className={buttonClasses({ variant: "ghost" })}>
            Clear
          </Link>
        )}
      </form>

      <Card>
        {entries.length === 0 ? (
          <EmptyState title="No activity found">{trackingNumber ? `Nothing recorded for ${trackingNumber}.` : null}</EmptyState>
        ) : (
          <ActivityList entries={entries} />
        )}
      </Card>

      {nextHref && (
        <div className="flex justify-center">
          <Link href={nextHref} className={buttonClasses({ variant: "outline" })}>
            Older entries
          </Link>
        </div>
      )}
    </div>
  );
}
