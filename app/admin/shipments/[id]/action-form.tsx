"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AddressSearch } from "@/components/admin/address-search";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/card";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { fieldErrorsFrom } from "@/lib/errors";
import { formatDateTime, formatDistance, msToHoursInput } from "@/lib/format";
import type { LiveMovement } from "@/lib/hooks";
import type { SnapResult } from "@/lib/movement";
import {
  SHIPMENT_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
  UPDATE_SOURCES,
  type Place,
  type Shipment,
  type ShipmentStatus,
  type UpdateSource,
} from "@/lib/types";
import { rerouteRequestSchema, shipmentActionRequestSchema } from "@/lib/validation";
import { rerouteAction, shipmentAction } from "../actions";

export type ActionMode = "start" | "pause" | "resume" | "set_position" | "adjust_eta" | "change_status" | "reroute" | "note";

const COPY: Record<ActionMode, { title: string; description: string; submit: string; success: string }> = {
  start: { title: "Start movement", description: "The marker starts moving along the route.", submit: "Start", success: "Movement started" },
  pause: { title: "Pause", description: "Freezes the marker and the ETA until you resume.", submit: "Pause", success: "Shipment paused" },
  resume: { title: "Resume", description: "Continues from where it paused with the time that was left.", submit: "Resume", success: "Movement resumed" },
  set_position: { title: "Set position", description: "Place the shipment where the driver says they are.", submit: "Save position", success: "Position updated" },
  adjust_eta: { title: "Adjust ETA", description: "Change the time left to the destination. The position stays where it is.", submit: "Save ETA", success: "ETA updated" },
  change_status: { title: "Change status", description: "Update the status customers see.", submit: "Change status", success: "Status changed" },
  reroute: { title: "Re-route", description: "Change the destination or add a stop. The route is fetched again from the current position.", submit: "Re-route", success: "Route updated" },
  note: { title: "Log update", description: "Record a call or note without changing movement.", submit: "Log update", success: "Update logged" },
};

const STATUS_EFFECTS: Record<ShipmentStatus, string> = {
  pending: "Resets progress to the start of the route.",
  in_transit: "Starts or resumes movement if it isn't moving.",
  paused: "Freezes the marker and the ETA.",
  out_for_delivery: "Starts or resumes movement if needed; final leg to the receiver.",
  delivered: "Moves the marker to the destination and stops the clock.",
};

type Errors = Record<string, string[] | undefined>;

const roundQuarter = (h: number) => Math.max(0, Math.round(h * 4) / 4);

export function ActionForm({
  mode,
  shipment,
  live,
  picked,
  onCancel,
  onDone,
}: {
  mode: ActionMode;
  shipment: Shipment;
  live: LiveMovement | null;
  picked: SnapResult | null;
  onCancel: () => void;
  onDone: () => void;
}) {
  const copy = COPY[mode];
  const [source, setSource] = useState<UpdateSource>("driver_call");
  const [locationInput, setLocationInput] = useState<string | null>(null);
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showToCustomer, setShowToCustomer] = useState(true);
  const [hoursInput, setHoursInput] = useState<string | null>(null);
  const [status, setStatus] = useState<ShipmentStatus>(
    shipment.status === "out_for_delivery" ? "delivered" : shipment.status === "delivered" ? "in_transit" : "out_for_delivery",
  );
  const [destination, setDestination] = useState<Place | null>(null);
  const [waypoint, setWaypoint] = useState<Place | null>(null);
  const [suggestedLabel, setSuggestedLabel] = useState<{ key: string; label: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pickedKey = picked ? `${picked.lat.toFixed(6)},${picked.lng.toFixed(6)}` : null;

  // Suggest a location label for a picked point (reverse geocoding).
  useEffect(() => {
    if (mode !== "set_position" || !picked || !pickedKey) return;
    const controller = new AbortController();
    fetch(`/api/geocode?lat=${picked.lat}&lng=${picked.lng}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { result?: { label: string } | null } | null) => {
        if (body?.result?.label) setSuggestedLabel({ key: pickedKey, label: body.result.label });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [mode, picked, pickedKey]);

  // Defaults that follow the shipment until the user types their own value.
  const defaultHours = (() => {
    switch (mode) {
      case "start":
        return String(shipment.estimatedDurationHours);
      case "adjust_eta":
        return live ? msToHoursInput(roundQuarter(live.remainingMs / 3_600_000) * 3_600_000) : "";
      case "set_position":
        return picked ? String(roundQuarter((1 - picked.fraction) * shipment.estimatedDurationHours)) : "";
      default:
        return "";
    }
  })();
  const hours = hoursInput ?? defaultHours;

  const defaultLocation =
    mode === "set_position" && suggestedLabel && suggestedLabel.key === pickedKey
      ? suggestedLabel.label
      : mode === "change_status" && status === "delivered"
        ? shipment.destination.label
        : (shipment.lastEvent?.locationLabel ?? shipment.origin.label);
  const locationLabel = locationInput ?? defaultLocation;

  const err = (...paths: string[]) => paths.map((p) => errors[p]?.[0]).find(Boolean);
  const hoursNumber = Number(hours);
  const previewEta = live && hours.trim() !== "" && Number.isFinite(hoursNumber) ? live.now + hoursNumber * 3_600_000 : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const update = { source, locationLabel, publicNote, internalNote, showToCustomer };
    const base = { shipmentId: shipment.id, expectedVersion: shipment.version, update };

    let result;
    if (mode === "reroute") {
      const parsed = rerouteRequestSchema.safeParse({
        ...base,
        destination,
        waypoint,
        remainingHours: hours.trim() === "" ? null : hours,
      });
      if (!parsed.success) return void setErrors(fieldErrorsFrom(parsed.error));
      setErrors({});
      setPending(true);
      result = await rerouteAction(parsed.data);
    } else {
      if (mode === "set_position" && !picked) {
        setErrors({ pick: ["Click the map to choose the position first."] });
        return;
      }
      const action =
        mode === "start" || mode === "adjust_eta"
          ? { type: mode, remainingHours: hours }
          : mode === "set_position"
            ? { type: mode, lat: picked!.lat, lng: picked!.lng, remainingHours: hours }
            : mode === "change_status"
              ? { type: mode, status }
              : { type: mode };
      const parsed = shipmentActionRequestSchema.safeParse({ ...base, action });
      if (!parsed.success) return void setErrors(fieldErrorsFrom(parsed.error));
      setErrors({});
      setPending(true);
      result = await shipmentAction(parsed.data);
    }
    setPending(false);

    if (result.ok) {
      toast.success(mode === "change_status" ? `Status changed to ${STATUS_LABELS[status]}` : copy.success);
      onDone();
    } else {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="mt-0.5 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Back to actions"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">{copy.title}</h2>
          <p className="mt-0.5 text-sm text-slate-600">{copy.description}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {formError && <ErrorNotice title="Not saved">{formError}</ErrorNotice>}

        {mode === "set_position" && (
          <div
            className={
              picked
                ? "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                : "rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            }
            aria-live="polite"
          >
            {picked ? (
              <>
                Snapped to <strong>{Math.round(picked.fraction * 100)}%</strong> of the route
                {picked.distanceM > 50 && <> ({formatDistance(picked.distanceM)} from where you clicked)</>}.
                {picked.distanceM > 5000 && (
                  <span className="mt-1 block font-medium text-amber-900">
                    That&apos;s far from the route. If the driver took another road, use Re-route instead.
                  </span>
                )}
              </>
            ) : (
              <>Click the map to choose where the shipment is now.</>
            )}
            {err("pick") && <span className="mt-1 block font-medium text-red-700">{err("pick")}</span>}
          </div>
        )}

        {mode === "change_status" && (
          <Field id="status" label="New status" required hint={STATUS_EFFECTS[status]}>
            <Select {...fieldAria("status", undefined, "hint")} value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
              {SHIPMENT_STATUSES.filter((s) => s !== shipment.status).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {mode === "reroute" && (
          <>
            <AddressSearch id="reroute-destination" label="New destination (optional)" value={destination} onChange={setDestination} error={err("destination", "destination.label")} />
            <AddressSearch id="reroute-waypoint" label="Add a waypoint (optional)" value={waypoint} onChange={setWaypoint} error={err("waypoint", "waypoint.label")} />
          </>
        )}

        {(mode === "start" || mode === "set_position" || mode === "adjust_eta" || mode === "reroute") && (
          <Field
            id="hours"
            label={mode === "reroute" ? "Hours to destination (optional)" : "Hours to destination"}
            required={mode !== "reroute"}
            error={err("action.remainingHours", "remainingHours")}
            hint={
              mode === "reroute"
                ? "Leave blank to estimate from the new route."
                : previewEta
                  ? `New ETA ≈ ${formatDateTime(previewEta)}`
                  : undefined
            }
          >
            <Input
              {...fieldAria("hours", err("action.remainingHours", "remainingHours"), mode === "reroute" || previewEta ? "hint" : undefined)}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.25"
              value={hours}
              onChange={(e) => setHoursInput(e.target.value)}
            />
            {mode === "adjust_eta" && (
              <div className="mt-2 flex flex-wrap gap-2" aria-label="Quick adjustments">
                {[-0.5, 0.5, 1, 2].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setHoursInput(String(Math.max(0, roundQuarter((Number(hours) || 0) + delta))))}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {delta > 0 ? "+" : "−"}
                    {Math.abs(delta) < 1 ? `${Math.abs(delta) * 60} min` : `${Math.abs(delta)} h`}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}

        <UpdateFields>
          <Field id="source" label="Source" required error={err("update.source")}>
            <Select {...fieldAria("source", err("update.source"))} value={source} onChange={(e) => setSource(e.target.value as UpdateSource)}>
              {UPDATE_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="location-label"
            label="Location"
            required
            error={err("update.locationLabel")}
            hint="Where the shipment is, as customers will see it."
          >
            <Input
              {...fieldAria("location-label", err("update.locationLabel"), "hint")}
              value={locationLabel}
              maxLength={120}
              onChange={(e) => setLocationInput(e.target.value)}
            />
          </Field>
          <Field id="public-note" label="Note for the customer (optional)" error={err("update.publicNote")}>
            <Textarea
              {...fieldAria("public-note", err("update.publicNote"))}
              rows={2}
              maxLength={500}
              value={publicNote}
              onChange={(e) => setPublicNote(e.target.value)}
            />
          </Field>
          <Field id="internal-note" label="Internal note (staff only)" error={err("update.internalNote")}>
            <Textarea
              {...fieldAria("internal-note", err("update.internalNote"))}
              rows={2}
              maxLength={1000}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-slate-300 accent-brand-700"
              checked={showToCustomer}
              onChange={(e) => setShowToCustomer(e.target.checked)}
            />
            <span>Show this update on the customer&apos;s timeline</span>
          </label>
        </UpdateFields>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} variant={mode === "change_status" && status === "pending" ? "danger" : "primary"}>
          {copy.submit}
        </Button>
      </div>
    </form>
  );
}

function UpdateFields({ children }: { children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Update details</legend>
      {children}
    </fieldset>
  );
}
