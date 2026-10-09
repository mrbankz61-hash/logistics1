"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { parseInput } from "@/lib/errors";
import { runAction } from "@/lib/server/action";
import { inviteStaff, setStaffDisabled, setStaffRole, staffResetLink } from "@/lib/server/staff";
import { inviteStaffSchema, staffDisabledSchema, staffRoleSchema } from "@/lib/validation";

/** Where set-up links should point: this site, as the admin is using it. */
async function siteUrl() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function inviteStaffAction(input: unknown) {
  const result = await runAction(async () => {
    const admin = await authorize("admin");
    return inviteStaff(parseInput(inviteStaffSchema, input), admin, await siteUrl());
  });
  if (result.ok) refresh();
  return result;
}

export async function setStaffRoleAction(input: unknown) {
  const result = await runAction(async () => {
    const admin = await authorize("admin");
    const { uid, role } = parseInput(staffRoleSchema, input);
    await setStaffRole(uid, role, admin);
  });
  refresh();
  return result;
}

export async function setStaffDisabledAction(input: unknown) {
  const result = await runAction(async () => {
    const admin = await authorize("admin");
    const { uid, disabled } = parseInput(staffDisabledSchema, input);
    await setStaffDisabled(uid, disabled, admin);
  });
  refresh();
  return result;
}

export async function staffResetLinkAction(input: unknown) {
  return runAction(async () => {
    const admin = await authorize("admin");
    const { uid } = parseInput(z.object({ uid: z.string().min(1).max(128) }), input);
    return staffResetLink(uid, admin, await siteUrl());
  });
}
