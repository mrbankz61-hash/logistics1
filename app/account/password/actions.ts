"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { adminDb } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

export interface PasswordState {
  error: string | null;
}

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "The two passwords don't match.", path: ["confirm"] });

export async function setPasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = schema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSessionClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Your link has expired. Ask an admin for a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choose a password you haven't used before."
          : error.code === "weak_password"
            ? "That password is too weak. Try a longer one."
            : error.message,
    };
  }

  const { data: staff } = await adminDb().from("staff").select("disabled").eq("id", userId).maybeSingle();
  if (!staff || staff.disabled) {
    await supabase.auth.signOut();
    redirect("/login");
  }
  await adminDb().from("staff").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  redirect("/admin");
}
