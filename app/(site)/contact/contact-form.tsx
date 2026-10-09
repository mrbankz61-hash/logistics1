"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/card";
import { Field, fieldAria, Input, Textarea } from "@/components/ui/field";
import { fieldErrorsFrom } from "@/lib/errors";
import { brand } from "@/lib/brand";
import { contactSchema } from "@/lib/validation";
import { sendContactMessage } from "./actions";

const empty = { name: "", email: "", phone: "", trackingNumber: "", message: "", company: "" };

export function ContactForm() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const err = (key: string) => errors[key]?.[0];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) return void setErrors(fieldErrorsFrom(parsed.error));
    setErrors({});
    setStatus("sending");
    const result = await sendContactMessage(parsed.data);
    if (result.ok) {
      setStatus("sent");
      setForm(empty);
    } else {
      setStatus("idle");
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-700" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-bold text-slate-900">Message sent</h2>
        <p className="mt-1 text-slate-700">Thanks. We reply during opening hours, usually within a few hours.</p>
        <Button variant="outline" className="mt-5" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <ErrorNotice title="Your message wasn't sent">
          {formError} You can also call us on {brand.phoneDisplay}.
        </ErrorNotice>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-name" label="Your name" required error={err("name")}>
          <Input {...fieldAria("c-name", err("name"))} autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field id="c-email" label="Email" required error={err("email")}>
          <Input {...fieldAria("c-email", err("email"))} type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field id="c-phone" label="Phone (optional)" error={err("phone")}>
          <Input {...fieldAria("c-phone", err("phone"))} type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field id="c-tn" label="Tracking number (if any)" error={err("trackingNumber")}>
          <Input {...fieldAria("c-tn", err("trackingNumber"))} className="font-mono uppercase" value={form.trackingNumber} onChange={set("trackingNumber")} />
        </Field>
      </div>
      <Field id="c-message" label="How can we help?" required error={err("message")} hint="For a quote, include pickup and delivery addresses and what you're sending.">
        <Textarea {...fieldAria("c-message", err("message"), "hint")} rows={5} value={form.message} onChange={set("message")} />
      </Field>
      {/* Honeypot: hidden from people and assistive tech. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="c-company">Company</label>
        <input id="c-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={set("company")} />
      </div>
      <Button type="submit" size="lg" loading={status === "sending"} className="w-full sm:w-auto">
        Send message
      </Button>
    </form>
  );
}
