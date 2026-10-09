"use client";

import { Copy, KeyRound, Mail, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, fieldAria, Input, Select } from "@/components/ui/field";
import { brand } from "@/lib/brand";
import { fieldErrorsFrom } from "@/lib/errors";
import { formatDate, formatRelative } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { ROLES, type Role, type StaffMember } from "@/lib/types";
import { inviteStaffSchema } from "@/lib/validation";
import { inviteStaffAction, setStaffDisabledAction, setStaffRoleAction, staffResetLinkAction } from "./actions";

type LinkDialog = { email: string; link: string; title: string } | null;

export function StaffManager({ staff, currentUid }: { staff: StaffMember[]; currentUid: string }) {
  const now = useNow(60_000);
  const [linkDialog, setLinkDialog] = useState<LinkDialog>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  async function changeRole(member: StaffMember, role: Role) {
    setBusyUid(member.uid);
    const result = await setStaffRoleAction({ uid: member.uid, role });
    setBusyUid(null);
    if (result.ok) toast.success(`${member.name} is now ${role === "admin" ? "an admin" : "a dispatcher"}. They'll need to sign in again.`);
    else toast.error(result.error);
  }

  async function toggleDisabled(member: StaffMember) {
    const disabled = !member.disabled;
    if (disabled && !window.confirm(`Disable ${member.name}? They'll be signed out immediately.`)) return;
    setBusyUid(member.uid);
    const result = await setStaffDisabledAction({ uid: member.uid, disabled });
    setBusyUid(null);
    if (result.ok) toast.success(disabled ? `${member.name} disabled` : `${member.name} re-enabled`);
    else toast.error(result.error);
  }

  async function resetLink(member: StaffMember) {
    setBusyUid(member.uid);
    const result = await staffResetLinkAction({ uid: member.uid });
    setBusyUid(null);
    if (result.ok) setLinkDialog({ email: member.email, link: result.data.link, title: "Password reset link" });
    else toast.error(result.error);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <Card className="lg:col-span-2">
        <CardHeader title="Team" description={`${staff.filter((s) => !s.disabled).length} active`} />
        {staff.length === 0 ? (
          <EmptyState title="No staff yet" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {staff.map((member) => {
              const self = member.uid === currentUid;
              const busy = busyUid === member.uid;
              return (
                <li key={member.uid} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {member.name} {self && <span className="text-xs font-medium text-slate-600">(you)</span>}
                      {member.disabled && (
                        <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-200 ring-inset">
                          Disabled
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-slate-600">{member.email}</p>
                    <p className="text-xs text-slate-600">
                      {member.lastLoginAt && now ? `Last sign-in ${formatRelative(member.lastLoginAt, now)}` : "Never signed in"}
                      {member.createdAt && now ? ` · added ${formatDate(member.createdAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${member.uid}`}>
                      Role for {member.name}
                    </label>
                    <Select
                      id={`role-${member.uid}`}
                      className="w-36"
                      value={member.role}
                      disabled={self || busy || member.disabled}
                      onChange={(e) => changeRole(member, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r === "admin" ? "Admin" : "Dispatcher"}
                        </option>
                      ))}
                    </Select>
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => resetLink(member)}>
                      <KeyRound className="size-4" aria-hidden />
                      Reset link
                    </Button>
                    {!self && (
                      <Button variant={member.disabled ? "outline" : "ghost"} size="sm" loading={busy} onClick={() => toggleDisabled(member)}>
                        {member.disabled ? "Enable" : "Disable"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <InviteForm onInvited={(email, link) => setLinkDialog({ email, link, title: "Invitation link" })} />

      <Dialog
        open={linkDialog !== null}
        onClose={() => setLinkDialog(null)}
        title={linkDialog?.title ?? ""}
        description="Send this one-time link to the staff member so they can set their password."
      >
        {linkDialog && <LinkPanel {...linkDialog} />}
      </Dialog>
    </div>
  );
}

function LinkPanel({ email, link }: { email: string; link: string }) {
  const subject = `Your ${brand.name} dashboard account`;
  const body = `Hello,\n\nSet your password with this link, then sign in at ${typeof window !== "undefined" ? window.location.origin : ""}/login:\n\n${link}\n`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        For <strong>{email}</strong>. The link expires after a while; generate a new one from the team list if needed.
      </p>
      <textarea readOnly value={link} rows={4} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-xs" aria-label="Password set-up link" />
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast.success("Link copied");
            } catch {
              toast.error("Couldn't copy; select the text and copy it manually.");
            }
          }}
        >
          <Copy className="size-4" aria-hidden />
          Copy link
        </Button>
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <Mail className="size-4" aria-hidden />
          Open in email app
        </a>
      </div>
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: (email: string, link: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("dispatcher");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = inviteStaffSchema.safeParse({ email, name, role });
    if (!parsed.success) return void setErrors(fieldErrorsFrom(parsed.error));
    setErrors({});
    setPending(true);
    const result = await inviteStaffAction(parsed.data);
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    toast.success(result.data.created ? `Invited ${parsed.data.email}` : `${parsed.data.email} already had an account; role updated`);
    onInvited(parsed.data.email, result.data.link);
    setEmail("");
    setName("");
  }

  return (
    <Card>
      <CardHeader title="Invite staff" description="Creates the account and gives you a link to send them." />
      <form onSubmit={onSubmit} noValidate className="space-y-4 p-5">
        <Field id="invite-name" label="Name" required error={errors.name?.[0]}>
          <Input {...fieldAria("invite-name", errors.name?.[0])} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field id="invite-email" label="Email" required error={errors.email?.[0]}>
          <Input {...fieldAria("invite-email", errors.email?.[0])} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="invite-role" label="Role" required>
          <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="dispatcher">Dispatcher: manage shipments</option>
            <option value="admin">Admin: everything, incl. staff</option>
          </Select>
        </Field>
        <Button type="submit" className="w-full" loading={pending}>
          <UserPlus className="size-4" aria-hidden />
          Invite
        </Button>
      </form>
    </Card>
  );
}
