import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { Spinner } from "@/components/ui/spinner";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-brand-700">
          <Spinner className="size-8" label="Loading dashboard" />
        </div>
      }
    >
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return <AdminShell user={user}>{children}</AdminShell>;
}
