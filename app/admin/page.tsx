import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PackagePlus } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { requireStaff } from "@/lib/auth/session";
import { listShipmentSummaries } from "@/lib/server/shipments";
import { ShipmentsTable } from "./shipments-table";

export const metadata: Metadata = { title: "Shipments" };

export default function ShipmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="mt-1 text-sm text-slate-600">Search, filter and open a shipment to record updates.</p>
        </div>
        <Link href="/admin/shipments/new" className={buttonClasses()}>
          <PackagePlus className="size-4" aria-hidden />
          New shipment
        </Link>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <ShipmentsData />
      </Suspense>
    </div>
  );
}

async function ShipmentsData() {
  await requireStaff();
  const rows = await listShipmentSummaries();
  return <ShipmentsTable rows={rows} />;
}

function TableSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading shipments">
      <Skeleton className="h-10 w-full max-w-xl" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
