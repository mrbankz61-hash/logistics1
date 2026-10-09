"use server";

import { refresh } from "next/cache";
import { authorize } from "@/lib/auth/session";
import { parseInput } from "@/lib/errors";
import { runAction } from "@/lib/server/action";
import { getDrivingRoute } from "@/lib/server/ors";
import { createShipment, rerouteShipment, runShipmentAction } from "@/lib/server/shipments";
import { toRouteGeometry } from "@/lib/shipments/route";
import {
  createShipmentSchema,
  rerouteRequestSchema,
  routePreviewSchema,
  shipmentActionRequestSchema,
} from "@/lib/validation";

export async function createShipmentAction(input: unknown) {
  return runAction(async () => {
    const user = await authorize();
    const data = parseInput(createShipmentSchema, input);
    return createShipment(data, user);
  });
}

/** Driving route preview for the create form. Not stored. */
export async function previewRouteAction(input: unknown) {
  return runAction(async () => {
    await authorize();
    const { origin, destination } = parseInput(routePreviewSchema, input);
    const driving = await getDrivingRoute([origin, destination]);
    const geometry = toRouteGeometry(driving.points, driving.durationS);
    return { points: geometry.points, cumulative: geometry.cumulative, distanceM: geometry.distanceM, durationS: driving.durationS };
  });
}

export async function shipmentAction(input: unknown) {
  const result = await runAction(async () => {
    const user = await authorize();
    const { shipmentId, expectedVersion, action, update } = parseInput(shipmentActionRequestSchema, input);
    return runShipmentAction(shipmentId, expectedVersion, action, update, user);
  });
  if (result.ok || result.code === "conflict") refresh();
  return result;
}

export async function rerouteAction(input: unknown) {
  const result = await runAction(async () => {
    const user = await authorize();
    return rerouteShipment(parseInput(rerouteRequestSchema, input), user);
  });
  if (result.ok || result.code === "conflict") refresh();
  return result;
}
