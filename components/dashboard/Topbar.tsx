"use client";

import Link from "next/link";

import {
  Bell,
  Menu,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/app/dashboard/logout-action";
import { Role } from "@/lib/roles";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  STUDENT: "Student",
  LIBRARIAN: "Librarian",
  HEALTH: "Health",
};

export default function Topbar({
  role,
  notificationCount,
  onMenuClick,
}: {
  role: Role;
  notificationCount: number;
  onMenuClick: () => void;
}) {
  const roleLabel = roleLabels[role];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-brand-border bg-white px-4 shadow-sm sm:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl border border-brand-border bg-white p-2 text-brand-primary transition hover:border-brand-primary hover:bg-brand-bg lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={21} strokeWidth={2.5} />
        </button>

        <div className="lg:hidden">
          <p className="text-sm font-black text-brand-primary">
            LUA
          </p>

          <p className="text-[10px] font-semibold text-brand-text-muted">
            Level UP Academy
          </p>
        </div>

        <div className="hidden lg:block">
          <p className="text-sm font-black text-brand-primary">
            Level UP Academy
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
            School Management System
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative rounded-xl border border-transparent p-2.5 text-brand-primary transition hover:border-brand-border hover:bg-brand-bg"
          aria-label={
            notificationCount > 0
              ? `${notificationCount} notifications`
              : "Notifications"
          }
        >
          <Bell size={19} strokeWidth={2.4} />

          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-danger px-1 text-[10px] font-black text-white ring-2 ring-white">
              {notificationCount > 99
                ? "99+"
                : notificationCount}
            </span>
          )}
        </Link>

        <div className="hidden h-8 w-px bg-brand-border sm:block" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-xs font-black text-white shadow-sm">
            {role.charAt(0)}
          </div>

          <div className="hidden sm:block">
            <p className="text-xs font-black text-brand-text">
              {roleLabel}
            </p>

            <div className="mt-0.5 flex items-center gap-1">
              <ShieldCheck
                size={11}
                className="text-brand-success"
                strokeWidth={2.5}
              />

              <p className="text-[10px] font-semibold text-brand-text-muted">
                Level UP Academy
              </p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-text-secondary transition hover:border-brand-danger/30 hover:bg-brand-danger-light hover:text-brand-danger"
          >
            <LogOut size={15} strokeWidth={2.4} />

            <span className="hidden sm:inline">
              Sign out
            </span>
          </button>
        </form>
      </div>
    </header>
  );
}

