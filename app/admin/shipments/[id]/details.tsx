import { Mail, MessageCircle, Phone } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { telHref, whatsappHref } from "@/lib/brand";
import type { Shipment } from "@/lib/types";

function ContactRow({
  role,
  name,
  phone,
  email,
  whatsappText,
}: {
  role: string;
  name: string;
  phone: string;
  email?: string;
  whatsappText?: string;
}) {
  return (
    <li className="px-5 py-3">
      <p className="text-xs font-medium tracking-wide text-slate-600 uppercase">{role}</p>
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="text-sm text-slate-700">{phone}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={telHref(phone)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Phone className="size-4" aria-hidden />
          Call<span className="sr-only"> {name}</span>
        </a>
        {whatsappText && (
          <a
            href={whatsappHref(phone, whatsappText)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <MessageCircle className="size-4" aria-hidden />
            Send tracking link<span className="sr-only"> to {name} on WhatsApp (opens in a new tab)</span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Mail className="size-4" aria-hidden />
            Email<span className="sr-only"> {name}</span>
          </a>
        )}
      </div>
    </li>
  );
}

export function ContactsCard({ shipment, className }: { shipment: Shipment; className?: string }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const trackingText = `Hello ${shipment.receiver.name}, you can follow your delivery here: ${site}/track/${shipment.trackingNumber}`;
  return (
    <Card className={className}>
      <CardHeader title="Contacts" />
      <ul className="divide-y divide-slate-100">
        <ContactRow role="Driver" name={shipment.driver.name} phone={shipment.driver.phone} />
        <ContactRow role="Receiver" name={shipment.receiver.name} phone={shipment.receiver.phone} email={shipment.receiver.email} whatsappText={trackingText} />
        <ContactRow role="Sender" name={shipment.sender.name} phone={shipment.sender.phone} email={shipment.sender.email} />
      </ul>
    </Card>
  );
}

export function DetailsCard({ shipment, className }: { shipment: Shipment; className?: string }) {
  const rows: Array<[string, string]> = [
    ["Package", shipment.package.description],
    ["Weight", `${shipment.package.weightKg} kg`],
    ["Quantity", String(shipment.package.quantity)],
    ["Planned duration", `${shipment.estimatedDurationHours} h`],
    ["Pickup address", shipment.origin.address],
    ["Delivery address", shipment.destination.address],
    ["Sender address", shipment.sender.address],
    ["Receiver address", shipment.receiver.address],
    ...shipment.waypoints.map((w, i): [string, string] => [`Waypoint ${i + 1}`, w.address]),
  ];
  return (
    <Card className={className}>
      <CardHeader title="Details" />
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8rem_1fr] gap-3 px-5 py-2.5">
            <dt className="text-slate-600">{label}</dt>
            <dd className="text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
