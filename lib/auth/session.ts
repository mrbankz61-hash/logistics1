import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { UserError } from "@/lib/errors";
import { adminDb } from "@/lib/supabase/admin";
import { isSupabaseConfigured, SupabaseConfigError } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { isRole, type Actor, type Role } from "@/lib/types";

export type StaffUser = Actor;

/**
 * Verifies the Supabase session (JWT) and looks the user up in `staff`, the
 * source of truth for roles. Disabling someone or changing their role takes
 * effect on their very next request. Memoised per request.
 */
export const getSessionUser = cache(async (): Promise<StaffUser | null> => {
  // Read the request first (outside try/catch) so prerendering defers to request time.
  await cookies();
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (error || !userId) return null;

    const { data: staff } = await adminDb()
      .from("staff")
      .select("id, email, name, role, disabled")
      .eq("id", userId)
      .maybeSingle();
    if (!staff || staff.disabled || !isRole(staff.role)) return null;
    return { uid: staff.id, email: staff.email, name: staff.name, role: staff.role };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof SupabaseConfigError) console.error(error.message);
    else console.error("Session check failed", error);
    return null;
  }
});

/** For pages: redirects to the login page when there is no valid staff session. */
export async function requireStaff(): Promise<StaffUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For Server Actions and Route Handlers: throws a user-facing error instead of redirecting. */
export async function authorize(role?: Role): Promise<StaffUser> {
  const user = await getSessionUser();
  if (!user) throw new UserError("Your session has expired. Please sign in again.");
  if (role === "admin" && user.role !== "admin") throw new UserError("Only admins can do that.");
  return user;
}
