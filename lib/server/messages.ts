import "server-only";
import { toMs } from "@/lib/db/rows";
import { adminDb, check } from "@/lib/supabase/admin";
import type { ContactInput } from "@/lib/validation";

export interface ContactMessage {
  id: string;
  at: number;
  name: string;
  email: string;
  phone: string;
  trackingNumber: string;
  message: string;
}

export async function saveContactMessage(input: ContactInput) {
  check(
    await adminDb().from("contact_messages").insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      tracking_number: input.trackingNumber,
      message: input.message,
    }),
  );
}

export async function listContactMessages(limit = 100): Promise<ContactMessage[]> {
  const rows = check(
    await adminDb().from("contact_messages").select("*").order("at", { ascending: false }).limit(limit),
  ) as Array<{ id: string; at: string; name: string; email: string; phone: string; tracking_number: string; message: string }>;
  return rows.map((r) => ({
    id: r.id,
    at: toMs(r.at),
    name: r.name,
    email: r.email,
    phone: r.phone,
    trackingNumber: r.tracking_number,
    message: r.message,
  }));
}
