"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AddressSearch } from "@/components/admin/address-search";
import { RouteMap } from "@/components/map";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, ErrorNotice } from "@/components/ui/card";
import { Field, fieldAria, Input, Textarea } from "@/components/ui/field";
import { fieldErrorsFrom } from "@/lib/errors";
import { formatDistance, formatDuration } from "@/lib/format";
import type { Place } from "@/lib/types";
import { createShipmentSchema } from "@/lib/validation";
import { createShipmentAction, previewRouteAction } from "../actions";

interface PartyForm {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface FormModel {
  sender: PartyForm;
  receiver: PartyForm;
  package: { description: string; weightKg: string; quantity: string };
  driver: { name: string; phone: string };
  estimatedDurationHours: string;
}

const emptyParty: PartyForm = { name: "", phone: "", email: "", address: "" };

interface Preview {
  points: { lat: number; lng: number }[];
  cumulative: number[];
  distanceM: number;
  durationS: number;
}

type Errors = Record<string, string[] | undefined>;

export function CreateShipmentForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormModel>({
    sender: { ...emptyParty },
    receiver: { ...emptyParty },
    package: { description: "", weightKg: "", quantity: "1" },
    driver: { name: "", phone: "" },
    estimatedDurationHours: "",
  });
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewState, setPreviewState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const err = (path: string) => errors[path]?.[0];

  function update<S extends "sender" | "receiver" | "package" | "driver">(section: S, field: keyof FormModel[S], value: string) {
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));
  }

  // Fetch a route preview whenever both ends are chosen.
  const originKey = origin ? `${origin.lat},${origin.lng}` : null;
  const destinationKey = destination ? `${destination.lat},${destination.lng}` : null;
  useEffect(() => {
    if (!origin || !destination) return;
    let cancelled = false;
    (async () => {
      setPreviewState({ loading: true, error: null });
      const result = await previewRouteAction({ origin, destination });
      if (cancelled) return;
      if (result.ok) {
        setPreview(result.data);
        setPreviewState({ loading: false, error: null });
        setForm((f) =>
          f.estimatedDurationHours
            ? f
            : { ...f, estimatedDurationHours: String(Math.max(0.5, Math.round((result.data.durationS / 3600) * 2) / 2)) },
        );
      } else {
        setPreview(null);
        setPreviewState({ loading: false, error: result.error });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the coordinates change
  }, [originKey, destinationKey]);

  function chooseOrigin(place: Place | null) {
    setOrigin(place);
    if (!place) setPreview(null);
    if (place && !form.sender.address) update("sender", "address", place.address);
  }

  function chooseDestination(place: Place | null) {
    setDestination(place);
    if (!place) setPreview(null);
    if (place && !form.receiver.address) update("receiver", "address", place.address);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const payload = { ...form, origin, destination };
    const parsed = createShipmentSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await createShipmentAction(parsed.data);
    if (result.ok) {
      toast.success(`Shipment ${result.data.trackingNumber} created`);
      router.push(`/admin/shipments/${result.data.id}`);
      return;
    }
    setSaving(false);
    setErrors(result.fieldErrors ?? {});
    setFormError(result.error);
    toast.error(result.error);
  }

  const partyFields = (who: "sender" | "receiver", title: string, description: string) => (
    <Section title={title} description={description}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${who}-name`} label="Full name" required error={err(`${who}.name`)}>
          <Input
            {...fieldAria(`${who}-name`, err(`${who}.name`))}
            autoComplete="off"
            value={form[who].name}
            onChange={(e) => update(who, "name", e.target.value)}
          />
        </Field>
        <Field id={`${who}-phone`} label="Phone" required error={err(`${who}.phone`)}>
          <Input
            {...fieldAria(`${who}-phone`, err(`${who}.phone`))}
            type="tel"
            inputMode="tel"
            value={form[who].phone}
            onChange={(e) => update(who, "phone", e.target.value)}
          />
        </Field>
        <Field id={`${who}-email`} label="Email (optional)" error={err(`${who}.email`)}>
          <Input
            {...fieldAria(`${who}-email`, err(`${who}.email`))}
            type="email"
            value={form[who].email}
            onChange={(e) => update(who, "email", e.target.value)}
          />
        </Field>
        <Field id={`${who}-address`} label="Address" required error={err(`${who}.address`)} className="sm:col-span-2">
          <Textarea
            {...fieldAria(`${who}-address`, err(`${who}.address`))}
            rows={2}
            value={form[who].address}
            onChange={(e) => update(who, "address", e.target.value)}
          />
        </Field>
      </div>
    </Section>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && <ErrorNotice title="Shipment not saved">{formError}</ErrorNotice>}

      <Section title="Route" description="Pickup and delivery locations. The public labels appear on the tracking page.">
        <div className="grid gap-4 md:grid-cols-2">
          <AddressSearch id="origin" label="Pickup (origin)" required value={origin} onChange={chooseOrigin} error={err("origin") ?? err("origin.label")} />
          <AddressSearch
            id="destination"
            label="Delivery (destination)"
            required
            value={destination}
            onChange={chooseDestination}
            error={err("destination") ?? err("destination.label")}
          />
        </div>
        {(previewState.loading || preview || previewState.error) && (
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {previewState.error ? (
              <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-900">
                {previewState.error}
              </p>
            ) : previewState.loading || !preview || !origin || !destination ? (
              <div className="flex h-64 items-center justify-center bg-slate-50 text-sm text-slate-600">Fetching driving route…</div>
            ) : (
              <>
                <RouteMap
                  label="Route preview"
                  className="h-64 w-full sm:h-80"
                  route={preview}
                  origin={origin}
                  destination={destination}
                />
                <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  {formatDistance(preview.distanceM)} by road · about {formatDuration(preview.durationS * 1000)} of driving
                </p>
              </>
            )}
          </div>
        )}
        <Field
          id="duration"
          label="Estimated duration (hours)"
          required
          className="mt-4 max-w-xs"
          error={err("estimatedDurationHours")}
          hint="Door to door, including stops. Prefilled from the routing estimate."
        >
          <Input
            {...fieldAria("duration", err("estimatedDurationHours"), "hint")}
            type="number"
            inputMode="decimal"
            min="0.25"
            step="0.25"
            value={form.estimatedDurationHours}
            onChange={(e) => setForm((f) => ({ ...f, estimatedDurationHours: e.target.value }))}
          />
        </Field>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        {partyFields("sender", "Sender", "Who is sending the package.")}
        {partyFields("receiver", "Receiver", "Who is receiving the package.")}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Package">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pkg-description" label="Description" required error={err("package.description")} className="sm:col-span-2">
              <Input
                {...fieldAria("pkg-description", err("package.description"))}
                placeholder="e.g. 2 boxes of documents"
                value={form.package.description}
                onChange={(e) => update("package", "description", e.target.value)}
              />
            </Field>
            <Field id="pkg-weight" label="Weight (kg)" required error={err("package.weightKg")}>
              <Input
                {...fieldAria("pkg-weight", err("package.weightKg"))}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={form.package.weightKg}
                onChange={(e) => update("package", "weightKg", e.target.value)}
              />
            </Field>
            <Field id="pkg-quantity" label="Quantity" required error={err("package.quantity")}>
              <Input
                {...fieldAria("pkg-quantity", err("package.quantity"))}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={form.package.quantity}
                onChange={(e) => update("package", "quantity", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Assigned driver">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="driver-name" label="Driver name" required error={err("driver.name")}>
              <Input
                {...fieldAria("driver-name", err("driver.name"))}
                value={form.driver.name}
                onChange={(e) => update("driver", "name", e.target.value)}
              />
            </Field>
            <Field id="driver-phone" label="Driver phone" required error={err("driver.phone")}>
              <Input
                {...fieldAria("driver-phone", err("driver.phone"))}
                type="tel"
                inputMode="tel"
                value={form.driver.phone}
                onChange={(e) => update("driver", "phone", e.target.value)}
              />
            </Field>
          </div>
        </Section>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => router.push("/admin")} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={saving}>
          {saving ? "Fetching route and saving…" : "Create shipment"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="p-5">{children}</div>
    </Card>
  );
}
