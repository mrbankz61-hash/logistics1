import "server-only";
import { rowToStaff, type StaffRow } from "@/lib/db/rows";
import { UserError } from "@/lib/errors";
import { adminDb, check } from "@/lib/supabase/admin";
import type { Actor, Role, StaffMember } from "@/lib/types";
import { writeActivity } from "./shipments";

/** Long enough to mean "until re-enabled". */
const BAN_FOREVER = "876000h";

export async function listStaff(): Promise<StaffMember[]> {
  const rows = check(await adminDb().from("staff").select("*")) as StaffRow[];
  return rows
    .map(rowToStaff)
    .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name));
}

async function getStaffRow(uid: string): Promise<StaffRow> {
  const row = check(await adminDb().from("staff").select("*").eq("id", uid).maybeSingle()) as StaffRow | null;
  if (!row) throw new UserError("Staff member not found.");
  return row;
}

/**
 * A one-time link that signs the person in and takes them to the set-password
 * page. Built from the token hash so it works without Supabase email templates.
 */
async function setupLink(email: string, siteUrl: string, preferInvite: boolean) {
  const auth = adminDb().auth.admin;
  const options = { redirectTo: `${siteUrl}/account/password` };
  const generate = (t: "invite" | "recovery") =>
    t === "invite"
      ? auth.generateLink({ type: "invite", email, options })
      : auth.generateLink({ type: "recovery", email, options });

  let type: "invite" | "recovery" = preferInvite ? "invite" : "recovery";
  let { data, error } = await generate(type);
  // Existing users can't be "invited" again; give them a recovery link instead.
  if (error && type === "invite" && (error.code === "email_exists" || /already/i.test(error.message))) {
    type = "recovery";
    ({ data, error } = await generate(type));
  }
  if (error || !data.user) throw new UserError(`Couldn't create a sign-in link: ${error?.message ?? "unknown error"}`);
  const params = new URLSearchParams({ token_hash: data.properties.hashed_token, type, next: "/account/password" });
  return { user: data.user, link: `${siteUrl}/auth/confirm?${params}`, created: type === "invite" };
}

/** Create (or re-invite) a staff account and return a password set-up link to send them. */
export async function inviteStaff(input: { email: string; name: string; role: Role }, actor: Actor, siteUrl: string) {
  const { user, link, created } = await setupLink(input.email, siteUrl, true);
  if (user.id === actor.uid) throw new UserError("That's your own account.");

  const db = adminDb();
  const existing = check(await db.from("staff").select("*").eq("id", user.id).maybeSingle()) as StaffRow | null;
  check(
    await db.from("staff").upsert({ id: user.id, email: input.email, name: input.name, role: input.role, disabled: false }),
  );
  if (!created) check(await db.auth.admin.updateUserById(user.id, { ban_duration: "none" }));

  await writeActivity({
    actor,
    at: Date.now(),
    action: created ? "staff.invite" : "staff.reinvite",
    summary: `${created ? "Invited" : "Re-invited"} ${input.email} as ${input.role}`,
    targetUid: user.id,
    before: existing ? { role: existing.role, disabled: existing.disabled } : null,
    after: { email: input.email, name: input.name, role: input.role, disabled: false },
  });
  return { uid: user.id, created, link };
}

export async function setStaffRole(uid: string, role: Role, actor: Actor) {
  if (uid === actor.uid) throw new UserError("You can't change your own role.");
  const row = await getStaffRow(uid);
  if (row.role === role) return;
  check(await adminDb().from("staff").update({ role }).eq("id", uid));
  await writeActivity({
    actor,
    at: Date.now(),
    action: "staff.role",
    summary: `Changed ${row.email}'s role from ${row.role} to ${role}`,
    targetUid: uid,
    before: { role: row.role },
    after: { role },
  });
}

export async function setStaffDisabled(uid: string, disabled: boolean, actor: Actor) {
  if (uid === actor.uid) throw new UserError("You can't disable your own account.");
  const row = await getStaffRow(uid);
  // The staff flag locks them out on their next request; the ban blocks new sign-ins and token refreshes.
  check(await adminDb().from("staff").update({ disabled }).eq("id", uid));
  check(await adminDb().auth.admin.updateUserById(uid, { ban_duration: disabled ? BAN_FOREVER : "none" }));
  await writeActivity({
    actor,
    at: Date.now(),
    action: disabled ? "staff.disable" : "staff.enable",
    summary: `${disabled ? "Disabled" : "Re-enabled"} ${row.email}`,
    targetUid: uid,
    before: { disabled: row.disabled },
    after: { disabled },
  });
}

export async function staffResetLink(uid: string, actor: Actor, siteUrl: string) {
  const row = await getStaffRow(uid);
  const { link } = await setupLink(row.email, siteUrl, false);
  await writeActivity({
    actor,
    at: Date.now(),
    action: "staff.reset_link",
    summary: `Generated a password reset link for ${row.email}`,
    targetUid: uid,
  });
  return { link };
}
