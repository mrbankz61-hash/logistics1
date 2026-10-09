import "server-only";
import { unstable_rethrow } from "next/navigation";
import { SupabaseConfigError } from "@/lib/supabase/config";
import type { ActionResult } from "@/lib/types";
import { UserError } from "@/lib/errors";

/**
 * Runs a Server Action body and converts failures into an ActionResult the
 * client can show in a toast. Unexpected errors are logged, not leaked.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof UserError) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors, code: error.code };
    }
    if (error instanceof SupabaseConfigError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
