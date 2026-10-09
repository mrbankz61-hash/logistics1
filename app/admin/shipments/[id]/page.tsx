import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/spinner";
import { requireStaff } from "@/lib/auth/session";
import { getShipment } from "@/lib/server/shipments";
import { ControlPanel } from "./control-panel";

export const metadata: Metadata = { title: "Shipment" };

export default function ShipmentPage({ params }: PageProps<"/admin/shipments/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ShipmentDetail params={params} />
    </Suspense>
  );
}

async function ShipmentDetail({ params }: { params: PageProps<"/admin/shipments/[id]">["params"] }) {
  const user = await requireStaff();
  const { id } = await params;
  const shipment = await getShipment(id);
  if (!shipment) notFound();
  return <ControlPanel shipment={shipment} user={user} />;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading shipment">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[28rem] lg:col-span-2" />
        <Skeleton className="h-[28rem]" />
      </div>
    </div>
  );
}
