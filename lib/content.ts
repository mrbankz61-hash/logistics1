/** Marketing copy shared by the public pages. Placeholder text; edit freely. */
import { Building2, CalendarClock, Clock4, Headphones, MapPinned, PackageCheck, ShieldCheck, Zap } from "lucide-react";

export type ServiceVisual = "same-day" | "next-day" | "scheduled" | "fragile";

export const SERVICES = [
  {
    slug: "same-day",
    icon: Zap,
    title: "Same-day delivery",
    /** Short uppercase headline for the scrolling showcase on the home page. */
    headline: "There by tonight.",
    tagline: "Booked by early afternoon",
    summary: "Book by early afternoon and it arrives today, anywhere in our city coverage area.",
    details: [
      "Pickup within a set window, usually inside two hours",
      "Direct route, no depot stop",
      "Live tracking link sent to the receiver",
    ],
    visual: "same-day" as ServiceVisual,
    /** Optional photo (e.g. "/images/same-day.jpg" in /public). Falls back to an illustration. */
    image: null as string | null,
  },
  {
    slug: "next-day",
    icon: Clock4,
    title: "Next-day regional",
    headline: "Overnight, city to city.",
    tagline: "Evening pickup, next-day drop",
    summary: "Overnight delivery between the towns and cities on our regular routes.",
    details: ["Evening collection, next-day drop-off", "Ideal for stock, spare parts and documents", "Confirmation call on delivery"],
    visual: "next-day" as ServiceVisual,
    image: null as string | null,
  },
  {
    slug: "scheduled",
    icon: CalendarClock,
    title: "Scheduled business runs",
    headline: "On your timetable.",
    tagline: "Daily or weekly rounds",
    summary: "Regular pickups for shops, pharmacies and offices on a timetable that suits you.",
    details: ["Daily or weekly rounds", "One monthly invoice", "A named dispatcher who knows your account"],
    visual: "scheduled" as ServiceVisual,
    image: null as string | null,
  },
  {
    slug: "fragile",
    icon: PackageCheck,
    title: "Fragile & high-value",
    headline: "Handled like it's ours.",
    tagline: "Signed for on delivery",
    summary: "Careful handling for electronics, medical supplies and anything that can't be replaced.",
    details: ["Padded vehicle space and secure straps", "Photo at pickup and drop-off", "Signature on delivery"],
    visual: "fragile" as ServiceVisual,
    image: null as string | null,
  },
] as const;

export const STEPS = [
  { title: "Book", text: "Call, WhatsApp or send a message with the pickup and delivery addresses. You get a price and a time window straight away." },
  { title: "Pickup", text: "A driver collects the package and you receive a tracking number for you and the receiver." },
  { title: "Follow along", text: "The tracking page shows the route, an estimated position and arrival time, updated every time the driver checks in." },
  { title: "Delivered", text: "The receiver signs, and the tracking page shows the shipment as delivered with the time." },
] as const;

export const REASONS = [
  { icon: Headphones, title: "People, not a call centre", text: "Our dispatchers talk to the drivers all day. Ask where your package is and you'll get a real answer." },
  { icon: MapPinned, title: "Honest arrival times", text: "When a driver is delayed we update the estimate, so the tracking page tells you what we know." },
  { icon: ShieldCheck, title: "Careful handling", text: "Packages are strapped down, never stacked carelessly, and handed over in person." },
  { icon: Building2, title: "Built for local business", text: "Flexible pickups, simple invoicing and a team that learns how your business runs." },
] as const;

export const KEYWORDS = ["Same-day", "Next-day", "Scheduled runs", "Fragile cargo", "Live tracking", "Real people"] as const;

/**
 * Hubs on the hero globe (planes fly between these). Decorative: put the
 * cities that matter to your customers here.
 */
export const GLOBE_HUBS = [
  { name: "London", lat: 51.47, lng: -0.45 },
  { name: "Lagos", lat: 6.58, lng: 3.32 },
  { name: "Cairo", lat: 30.12, lng: 31.41 },
  { name: "Nairobi", lat: -1.32, lng: 36.93 },
  { name: "Johannesburg", lat: -26.14, lng: 28.24 },
  { name: "Dubai", lat: 25.25, lng: 55.36 },
  { name: "Mumbai", lat: 19.09, lng: 72.87 },
  { name: "Singapore", lat: 1.36, lng: 103.99 },
  { name: "New York", lat: 40.64, lng: -73.78 },
  { name: "São Paulo", lat: -23.43, lng: -46.47 },
];

/** Longitude facing the viewer when the page loads. */
export const GLOBE_START_LNG = 18;
