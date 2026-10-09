import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateShipmentForm } from "./create-shipment-form";

export const metadata: Metadata = { title: "New shipment" };

export default function NewShipmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ChevronLeft className="size-4" aria-hidden />
          Shipments
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New shipment</h1>
        <p className="mt-1 text-sm text-slate-600">
          The driving route is fetched when you save, and a tracking number is generated automatically.
        </p>
      </div>
      <CreateShipmentForm />
    </div>
  );
}
