/** zod schemas shared by client forms and server actions. The server always re-validates. */
import { z } from "zod";
import { ROLES, SHIPMENT_STATUSES, UPDATE_SOURCES } from "./types";

const text = (min: number, max: number, message?: string) => z.string().trim().min(min, message).max(max);

export const phoneSchema = z
  .string()
  .trim()
  .min(5, "Enter a phone number")
  .max(32, "Phone number is too long")
  .regex(/^[+()\d\s.-]+$/, "Use digits, spaces and + - ( ) only");

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email or leave it blank");

export const placeSchema = z.object({
  label: text(2, 120, "Enter a short public label, e.g. the town or area"),
  address: text(2, 300, "Choose an address"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const partySchema = z.object({
  name: text(2, 100, "Enter a name"),
  phone: phoneSchema,
  email: optionalEmail,
  address: text(5, 300, "Enter the full address"),
});

export const createShipmentSchema = z.object({
  sender: partySchema,
  receiver: partySchema,
  package: z.object({
    description: text(2, 300, "Describe the package"),
    weightKg: z.coerce.number().positive("Enter the weight in kg").max(100_000),
    quantity: z.coerce.number().int("Use a whole number").min(1, "At least 1").max(10_000),
  }),
  origin: placeSchema,
  destination: placeSchema,
  driver: z.object({
    name: text(2, 100, "Enter the driver's name"),
    phone: phoneSchema,
  }),
  estimatedDurationHours: z.coerce.number().positive("Enter the expected hours").max(720, "Maximum is 720 hours"),
});
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const routePreviewSchema = z.object({
  origin: placeSchema.pick({ lat: true, lng: true }),
  destination: placeSchema.pick({ lat: true, lng: true }),
});

/** Fields every dispatch update must include. */
export const updateFieldsSchema = z.object({
  source: z.enum(UPDATE_SOURCES, "Choose where this update came from"),
  locationLabel: text(2, 120, "Enter where the shipment is, e.g. “Depot, North Ring Road”"),
  publicNote: z.string().trim().max(500).default(""),
  internalNote: z.string().trim().max(1000).default(""),
  showToCustomer: z.boolean().default(true),
});
export type UpdateFields = z.infer<typeof updateFieldsSchema>;

const hours = z.coerce.number().min(0, "Hours can't be negative").max(720, "Maximum is 720 hours");

export const shipmentActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), remainingHours: hours.positive("Enter the hours to destination") }),
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("resume") }),
  z.object({
    type: z.literal("set_position"),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    remainingHours: hours,
  }),
  z.object({ type: z.literal("adjust_eta"), remainingHours: hours }),
  z.object({ type: z.literal("change_status"), status: z.enum(SHIPMENT_STATUSES) }),
  z.object({ type: z.literal("note") }),
]);
export type ShipmentAction = z.infer<typeof shipmentActionSchema>;

const shipmentRef = {
  shipmentId: z.string().min(1).max(128),
  expectedVersion: z.number().int().min(0),
};

export const shipmentActionRequestSchema = z.object({
  ...shipmentRef,
  action: shipmentActionSchema,
  update: updateFieldsSchema,
});

export const rerouteRequestSchema = z
  .object({
    ...shipmentRef,
    destination: placeSchema.nullable(),
    waypoint: placeSchema.nullable(),
    remainingHours: hours.positive("Enter the hours to destination").nullable(),
    update: updateFieldsSchema,
  })
  .refine((d) => d.destination || d.waypoint, {
    message: "Choose a new destination or add a waypoint",
    path: ["destination"],
  });
export type RerouteRequest = z.infer<typeof rerouteRequestSchema>;

export const inviteStaffSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  name: text(2, 100, "Enter a name"),
  role: z.enum(ROLES),
});

export const staffRoleSchema = z.object({ uid: z.string().min(1).max(128), role: z.enum(ROLES) });
export const staffDisabledSchema = z.object({ uid: z.string().min(1).max(128), disabled: z.boolean() });

export const contactSchema = z.object({
  name: text(2, 100, "Enter your name"),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  phone: z.union([z.literal(""), phoneSchema]).default(""),
  trackingNumber: z.string().trim().max(20).default(""),
  message: text(10, 2000, "Tell us a little more (at least 10 characters)"),
  /** Honeypot: real users never fill this in. Checked by the action, which then silently drops the message. */
  company: z.string().max(200).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;
