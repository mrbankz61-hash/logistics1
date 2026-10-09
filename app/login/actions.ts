"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth/redirects";
import { adminDb } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

export interface SignInState {
  error: string | null;
  email: string;
}

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

function friendlyAuthError(code: string | undefined, message: string): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match a staff account.";
    case "user_banned":
      return "This account has been disabled. Contact an admin.";
    case "email_not_confirmed":
      return "This account hasn't been activated yet. Use the set-up link your admin sent you.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      if (/fetch|network|timed? ?out/i.test(message)) {
        return "Can't reach the sign-in service right now. Check your connection and try again.";
      }
      return message || "Sign in failed. Please try again.";
  }
}

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  if (!isSupabaseConfigured) return { email, error: "Sign-in is not configured yet." };

  const parsed = signInSchema.safeParse({
    email,
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { email, error: parsed.error.issues[0].message };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { email, error: friendlyAuthError(error?.code, error?.message ?? "") };

  // A valid login isn't enough: the account must be active staff.
  const { data: staff } = await adminDb().from("staff").select("disabled").eq("id", data.user.id).maybeSingle();
  if (!staff || staff.disabled) {
    await supabase.auth.signOut();
    return {
      email,
      error: staff ? "This account has been disabled. Contact an admin." : "This account doesn't have staff access. Ask an admin to invite you.",
    };
  }
  await adminDb().from("staff").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);

  redirect(safeNext(parsed.data.next));
}

/**
 * Self-service reset. Sends Supabase's password-reset email (needs email
 * delivery configured in Supabase). Admins can always generate a link instead.
 */
export async function requestPasswordResetAction(email: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.string().trim().toLowerCase().pipe(z.email()).safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter your email address first." };
  if (!isSupabaseConfigured) return { ok: false, error: "Sign-in is not configured yet." };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/account/password`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { ok: false, error: "Too many reset emails were requested. Try again later or ask an admin for a link." };
  }
  // Otherwise don't reveal whether the account exists.
  return { ok: true };
}
