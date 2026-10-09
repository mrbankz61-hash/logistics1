import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Mail, Phone } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { requireStaff } from "@/lib/auth/session";
import { telHref } from "@/lib/brand";
import { listContactMessages } from "@/lib/server/messages";
import { LocalTime } from "@/components/local-time";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-600">Enquiries sent from the public contact form, newest first.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <MessagesContent />
      </Suspense>
    </div>
  );
}

async function MessagesContent() {
  await requireStaff();
  const messages = await listContactMessages();
  return (
    <Card>
      {messages.length === 0 ? (
        <EmptyState title="No messages yet" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {messages.map((m) => (
            <li key={m.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900">{m.name}</p>
                <LocalTime ms={m.at} className="text-xs text-slate-600" />
              </div>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-800">{m.message}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                  <Mail className="size-3.5" aria-hidden />
                  {m.email}
                </a>
                {m.phone && (
                  <a href={telHref(m.phone)} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                    <Phone className="size-3.5" aria-hidden />
                    {m.phone}
                  </a>
                )}
                {m.trackingNumber && (
                  <Link href={`/admin/activity?tn=${encodeURIComponent(m.trackingNumber)}`} className="font-mono text-slate-700 hover:underline">
                    {m.trackingNumber}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
