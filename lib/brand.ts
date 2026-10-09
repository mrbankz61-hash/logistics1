/**
 * Agency branding and contact details in one place.
 * Swap these placeholder values for the real agency before launch.
 */
export const brand = {
  name: "[AGENCY NAME]",
  tagline: "Door-to-door delivery you can follow, mile by mile.",
  description:
    "A local courier and delivery agency. Same-day and scheduled deliveries, with live shipment tracking and real people on the phone.",
  /** Prefix for tracking numbers, e.g. "XXX" gives XXX-7KQ4M2TZ. 2-6 uppercase letters/digits. */
  trackingPrefix: "XXX",
  phone: "+10000000000",
  phoneDisplay: "+1 (000) 000-0000",
  /** WhatsApp number in international format without "+" or spaces. */
  whatsapp: "10000000000",
  email: "hello@example.com",
  address: "123 Example Street, Your City",
  hours: "Monday to Saturday, 7:00 to 20:00",
} as const;

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
