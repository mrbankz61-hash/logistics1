import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";

export function NoAccess() {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <ShieldAlert className="mx-auto size-10 text-slate-400" aria-hidden />
      <h1 className="mt-3 font-display text-lg font-bold text-slate-900">Admins only</h1>
      <p className="mt-1 text-sm text-slate-600">Your role doesn&apos;t include this page. Ask an admin if you need access.</p>
    </Card>
  );
}
