"use client";

import clsx from "clsx";
import { History, Inbox, LogOut, Menu, PackagePlus, Package, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import type { StaffUser } from "@/lib/auth/session";
import { signOutAction } from "./actions";

const NAV = [
  { href: "/admin", label: "Shipments", icon: Package, adminOnly: false, exact: true },
  { href: "/admin/shipments/new", label: "New shipment", icon: PackagePlus, adminOnly: false, exact: true },
  { href: "/admin/messages", label: "Messages", icon: Inbox, adminOnly: false, exact: false },
  { href: "/admin/activity", label: "Activity log", icon: History, adminOnly: true, exact: false },
  { href: "/admin/staff", label: "Staff", icon: Users, adminOnly: true, exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href || (href === "/admin" && pathname.startsWith("/admin/shipments/") && !pathname.endsWith("/new"));
  return pathname.startsWith(href);
}

export function AdminShell({ user, children }: { user: StaffUser; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((item) => !item.adminOnly || user.role === "admin");

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1 p-3">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="size-4.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const userBox = (
    <div className="border-t border-slate-200 p-4">
      <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
      <p className="truncate text-xs text-slate-600">
        {user.email} · <span className="capitalize">{user.role}</span>
      </p>
      <form action={signOutAction} className="mt-3">
        <button
          type="submit"
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link href="/admin" className="flex h-16 items-center border-b border-slate-200 px-5">
          <Logo />
        </Link>
        {nav}
        {userBox}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-[1100] flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Link href="/admin">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </header>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-14 bottom-0 z-[1100] flex flex-col bg-white lg:hidden">
          {nav}
          {userBox}
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
