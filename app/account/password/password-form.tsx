"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { setPasswordAction, type PasswordState } from "./actions";

export function PasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(setPasswordAction, { error: null });
  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state.error && <ErrorNotice title="Password not saved">{state.error}</ErrorNotice>}
      {/* Helps password managers store the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <Field id="password" label="New password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-describedby="password-hint" />
      </Field>
      <Field id="confirm" label="Confirm password">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Save and continue
      </Button>
    </form>
  );
}
