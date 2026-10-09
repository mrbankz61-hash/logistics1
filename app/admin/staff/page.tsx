import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { Skeleton } from "@/components/ui/spinner";
import { requireStaff } from "@/lib/auth/session";
import { listStaff } from "@/lib/server/staff";
import { StaffManager } from "./staff-manager";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Staff</h1>
        <p className="mt-1 text-sm text-slate-600">
          Admins can do everything, including managing staff. Dispatchers manage shipments.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <StaffContent />
      </Suspense>
    </div>
  );
}

async function StaffContent() {
  const user = await requireStaff();
  if (user.role !== "admin") return <NoAccess />;
  const staff = await listStaff();
  return <StaffManager staff={staff} currentUid={user.uid} />;
}
