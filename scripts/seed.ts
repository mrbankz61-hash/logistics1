/**
 * Load three sample shipments (pending, in transit, paused) so the dashboard
 * and tracking page have something to show. Safe to re-run: it overwrites the
 * same three documents.
 *
 *   npm run seed
 *   npm run seed -- --dry-run     (build and print, write nothing)
 *
 * Uses OpenRouteService for real road routes when ORS_API_KEY is set,
 * otherwise falls back to straight lines. Edit SAMPLES for your own area.
 */
import { argValue } from "./load-env";
import { randomUUID } from "node:crypto";
import { brand } from "@/lib/brand";
import { straightLine } from "@/lib/geo";
import { currentFraction, etaMs, hoursToMs, initialMovement } from "@/lib/movement";
import { applyShipmentAction } from "@/lib/shipments/reducer";
import { toRouteGeometry } from "@/lib/shipments/route";
import { getDrivingRoute } from "@/lib/server/ors";
import { importShipment } from "@/lib/server/shipments";
import type { Actor, Place, Shipment, TimelineEvent } from "@/lib/types";
import type { ShipmentAction, UpdateFields } from "@/lib/validation";

const MIN = 60_000;
const actor: Actor = { uid: "seed", name: "Sample data", email: "", role: "admin" };

interface Step {
  minutesAgo: number;
  action: ShipmentAction;
  update: Partial<UpdateFields> & Pick<UpdateFields, "locationLabel">;
}

interface Sample {
  id: string;
  suffix: string;
  origin: Place;
  destination: Place;
  hours: number;
  createdMinutesAgo: number;
  sender: Shipment["sender"];
  receiver: Shipment["receiver"];
  driver: Shipment["driver"];
  package: Shipment["package"];
  steps: Step[];
}

// Fictional people; phone numbers are from the UK range reserved for drama (07700 900xxx).
const SAMPLES: Sample[] = [
  {
    id: "5a3b1e00-0000-4000-8000-000000000001",
    suffix: "SAMPLE01",
    origin: { label: "Manchester", address: "Piccadilly, Manchester", lat: 53.4774, lng: -2.2309 },
    destination: { label: "Leeds", address: "City Square, Leeds", lat: 53.796, lng: -1.5479 },
    hours: 2,
    createdMinutesAgo: 20,
    sender: { name: "Northside Print Co.", phone: "+44 7700 900101", email: "orders@example.com", address: "Piccadilly, Manchester" },
    receiver: { name: "Priya Shah", phone: "+44 7700 900102", email: "priya@example.com", address: "City Square, Leeds" },
    driver: { name: "Sam Okafor", phone: "+44 7700 900103" },
    package: { description: "Boxed brochures", weightKg: 12, quantity: 3 },
    steps: [],
  },
  {
    id: "5a3b1e00-0000-4000-8000-000000000002",
    suffix: "SAMPLE02",
    origin: { label: "London Bridge, London", address: "London Bridge, London", lat: 51.5045, lng: -0.0865 },
    destination: { label: "Brighton", address: "North Street, Brighton", lat: 50.8225, lng: -0.1372 },
    hours: 3,
    createdMinutesAgo: 150,
    sender: { name: "Harbour Pharmacy", phone: "+44 7700 900201", email: "", address: "London Bridge, London" },
    receiver: { name: "Tom Ellis", phone: "+44 7700 900202", email: "tom@example.com", address: "North Street, Brighton" },
    driver: { name: "Grace Mensah", phone: "+44 7700 900203" },
    package: { description: "Temperature-sensitive medical supplies", weightKg: 4.5, quantity: 1 },
    steps: [
      {
        minutesAgo: 90,
        action: { type: "start", remainingHours: 3 },
        update: { source: "driver_call", locationLabel: "London Bridge", publicNote: "Your parcel has been collected and is on its way." },
      },
      {
        minutesAgo: 40,
        action: { type: "note" },
        update: { source: "driver_call", locationLabel: "M23, near Crawley", internalNote: "Driver called: light traffic, on schedule.", showToCustomer: false },
      },
    ],
  },
  {
    id: "5a3b1e00-0000-4000-8000-000000000003",
    suffix: "SAMPLE03",
    origin: { label: "Birmingham", address: "New Street, Birmingham", lat: 52.4862, lng: -1.8904 },
    destination: { label: "Bristol", address: "Queen Square, Bristol", lat: 51.4545, lng: -2.5879 },
    hours: 3.5,
    createdMinutesAgo: 240,
    sender: { name: "Midlands Parts Ltd", phone: "+44 7700 900301", email: "dispatch@example.com", address: "New Street, Birmingham" },
    receiver: { name: "Aled Morgan", phone: "+44 7700 900302", email: "", address: "Queen Square, Bristol" },
    driver: { name: "Lena Novak", phone: "+44 7700 900303" },
    package: { description: "Spare machine parts (fragile)", weightKg: 28, quantity: 2 },
    steps: [
      {
        minutesAgo: 180,
        action: { type: "start", remainingHours: 3.5 },
        update: { source: "dispatch", locationLabel: "Birmingham depot", publicNote: "Picked up and on the way." },
      },
      {
        minutesAgo: 90,
        action: { type: "adjust_eta", remainingHours: 2.5 },
        update: { source: "driver_call", locationLabel: "M5, Worcester", publicNote: "Roadworks are slowing traffic a little." },
      },
      {
        minutesAgo: 30,
        action: { type: "pause" },
        update: { source: "driver_call", locationLabel: "Gloucester services", publicNote: "The driver is taking a required rest break.", internalNote: "45-minute tachograph break." },
      },
    ],
  },
];

async function routeFor(sample: Sample) {
  if (process.env.ORS_API_KEY) {
    const r = await getDrivingRoute([sample.origin, sample.destination]);
    return toRouteGeometry(r.points, r.durationS);
  }
  return toRouteGeometry(straightLine(sample.origin, sample.destination, 60), sample.hours * 3600);
}

async function build(sample: Sample, now: number): Promise<Shipment> {
  const createdAt = now - sample.createdMinutesAgo * MIN;
  const by = { uid: actor.uid, name: actor.name };
  const created: TimelineEvent = {
    id: randomUUID(),
    at: createdAt,
    type: "created",
    title: "Shipment created",
    status: "pending",
    source: "office",
    locationLabel: sample.origin.label,
    publicNote: "",
    internalNote: "",
    showToCustomer: true,
    by,
  };
  let shipment: Shipment = {
    id: sample.id,
    trackingNumber: `${brand.trackingPrefix}-${sample.suffix}`,
    version: 1,
    sender: sample.sender,
    receiver: sample.receiver,
    package: sample.package,
    origin: sample.origin,
    destination: sample.destination,
    waypoints: [],
    driver: sample.driver,
    estimatedDurationHours: sample.hours,
    route: await routeFor(sample),
    status: "pending",
    statusBeforePause: null,
    movement: initialMovement(createdAt, hoursToMs(sample.hours)),
    events: [created],
    lastEvent: { at: createdAt, title: created.title, locationLabel: created.locationLabel },
    createdAt,
    updatedAt: createdAt,
    createdBy: by,
  };

  // Replay each step through the same reducer the dashboard uses.
  for (const step of sample.steps) {
    const at = now - step.minutesAgo * MIN;
    const update: UpdateFields = { source: "dispatch", publicNote: "", internalNote: "", showToCustomer: true, ...step.update };
    const result = applyShipmentAction(shipment, step.action, update, { now: at, eventId: randomUUID(), by });
    shipment = {
      ...shipment,
      ...result.patch,
      version: shipment.version + 1,
      events: [...shipment.events, result.event],
      lastEvent: { at, title: result.event.title, locationLabel: result.event.locationLabel },
      updatedAt: at,
    };
  }
  return shipment;
}

async function main() {
  if (!process.env.ORS_API_KEY) {
    console.warn("ORS_API_KEY not set: sample routes will be straight lines instead of roads.");
  }
  const dryRun = process.argv.includes("--dry-run");
  const now = Date.now();
  const site = argValue("site") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  for (const sample of SAMPLES) {
    const shipment = await build(sample, now);
    if (!dryRun) await importShipment(shipment, actor);
    const progress = Math.round(currentFraction(shipment.movement, now) * 100);
    const eta = etaMs(shipment.movement);
    console.log(
      `✔ ${shipment.trackingNumber}  ${shipment.status.padEnd(11)} ${progress}%  ${sample.origin.label} → ${sample.destination.label}` +
        `  (${Math.round(shipment.route.distanceM / 1000)} km, ${shipment.route.points.length} points, ${shipment.events.length} events${eta ? `, ETA ${new Date(eta).toLocaleTimeString()}` : ""})`,
    );
    console.log(`    ${site}/track/${shipment.trackingNumber}`);
  }
  console.log(dryRun ? "Dry run: nothing was written." : `Done. ${SAMPLES.length} sample shipments loaded.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
