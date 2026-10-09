"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requestPasswordResetAction, signInAction, type SignInState } from "./actions";

const LINK_ERRORS: Record<string, string> = {
  link: "That sign-in link is invalid or has expired. Ask an admin for a new one.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, { error: null, email: "" });
  const [email, setEmail] = useState("");
  const [resetPending, startReset] = useTransition();
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""];

  function onResetPassword() {
    startReset(async () => {
      const result = await requestPasswordResetAction(email || state.email);
      if (!result.ok) toast.error(result.error ?? "Couldn't send a reset email.");
      else toast.success("If that email belongs to a staff account, a reset link is on its way. No email? Ask an admin for a reset link.");
    });
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mt-8">
        <ErrorNotice title="Sign-in is not configured">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to your environment
          (see <code>.env.example</code>).
        </ErrorNotice>
      </div>
    );
  }

  const error = state.error ?? linkError;

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {error && <ErrorNotice title="Couldn't sign you in">{error}</ErrorNotice>}
      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Sign in
      </Button>
      <button
        type="button"
        onClick={onResetPassword}
        disabled={resetPending}
        className="w-full text-center text-sm font-medium text-brand-700 hover:underline disabled:opacity-60"
      >
        Forgot password?
      </button>
    </form>
  );
}
