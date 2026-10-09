import clsx from "clsx";
import { CheckCircle2, Clock3, PauseCircle, Truck, PackageCheck } from "lucide-react";
import { STATUS_LABELS, type ShipmentStatus } from "@/lib/types";

const STYLES: Record<ShipmentStatus, { className: string; Icon: typeof Truck }> = {
  pending: { className: "bg-slate-100 text-slate-800 ring-slate-300", Icon: Clock3 },
  in_transit: { className: "bg-sky-50 text-sky-900 ring-sky-300", Icon: Truck },
  paused: { className: "bg-amber-50 text-amber-900 ring-amber-300", Icon: PauseCircle },
  out_for_delivery: { className: "bg-violet-50 text-violet-900 ring-violet-300", Icon: PackageCheck },
  delivered: { className: "bg-emerald-50 text-emerald-900 ring-emerald-300", Icon: CheckCircle2 },
};

/** Status pill with an icon, so it never relies on colour alone. */
export function StatusBadge({ status, size = "sm" }: { status: ShipmentStatus; size?: "sm" | "lg" }) {
  const { className, Icon } = STYLES[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ring-1 ring-inset",
        size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs",
        className,
      )}
    >
      <Icon className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
