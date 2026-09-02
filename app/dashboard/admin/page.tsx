import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  School,
  ShieldCheck,
  Users,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [
    userCount,
    studentCount,
    pendingApplications,
    teacherCount,
    sectionCount,
    subjectCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.teacherApplication.count({
      where: { status: "PENDING" },
    }),
    prisma.teacher.count(),
    prisma.section.count(),
    prisma.subject.count(),
  ]);

  const stats = [
    {
      label: "Total Users",
      value: userCount,
      description: "Registered accounts",
      icon: Users,
    },
    {
      label: "Students",
      value: studentCount,
      description: "Currently enrolled",
      icon: GraduationCap,
    },
    {
      label: "Teacher Applications",
      value: pendingApplications,
      description: "Waiting for review",
      icon: UserPlus,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Administration
              </span>

              <span className="text-xs text-slate-400">Level UP Academy</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white sm:flex">
                <LayoutDashboard className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Admin Overview
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your school, users, academics and daily activities
                  from one place.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/admin/applications"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Teacher Applications
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-brand-primary transitiongroup-hover:bg-brand-primary group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main content */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <LayoutDashboard className="h-4 w-4" />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Quick Actions
              </h2>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Frequently used administration tools.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickAction
              href="/dashboard/admin/users"
              icon={UsersRound}
              title="Manage Users"
              description="Students and teachers"
            />

            <QuickAction
              href="/dashboard/admin/applications"
              icon={UserPlus}
              title="Teacher Applications"
              description="Review new teacher applications"
              highlighted
            />

            <QuickAction
              href="/dashboard/admin/audit-log"
              icon={ShieldCheck}
              title="Audit Log"
              description="Review important system activity"
            />
          </div>
        </div>

        {/* Applications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Teacher Applications
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Applications overview
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-brand-primary">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pending review
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {pendingApplications}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {pendingApplications === 1
                ? "application requires"
                : "applications require"}{" "}
              your attention.
            </p>
          </div>

          <Link
            href="/dashboard/admin/applications"
            className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-primary hover:bg-slate-100"
          >
            Open applications
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* School Overview */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-brand-primary">
              <School className="h-4 w-4" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              School Overview
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Current structure of your school management system.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <OverviewItem icon={UserCheck} label="Teachers" value={teacherCount} />
          <OverviewItem icon={GraduationCap} label="Students" value={studentCount} />
          <OverviewItem icon={School} label="Sections" value={sectionCount} />
          <OverviewItem icon={BookOpen} label="Subjects" value={subjectCount} />
        </div>
      </section>

      {/* Attention */}
      {pendingApplications > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-brand-primary">
              <AlertCircle className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Items needing attention
              </h2>

              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {pendingApplications > 0 && (
                  <p>
                    - {pendingApplications} teacher application
                    {pendingApplications !== 1 ? "s" : ""} waiting for
                    review.
                  </p>
                )}

              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  highlighted = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-4 transition ${
        highlighted
          ? "border-slate-200 bg-slate-50 hover:border-brand-primary"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              highlighted
                ? "bg-slate-100 text-brand-primary"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-primary" />
      </div>
    </Link>
  );
}

function OverviewItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-brand-primary" />
      </div>

      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}