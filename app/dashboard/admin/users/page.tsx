import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { prisma } from "@/lib/prisma";
import {
  Activity,
  ArrowRight,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Stethoscope,
  Users,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

export default async function AdminUsersPage() {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    adminCount,
    teacherCount,
    studentCount,
    staffCount,
    recentUsers,
    homeroomCount,
    subjectAssignmentCount,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: { isActive: true },
    }),

    prisma.user.count({
      where: { isActive: false },
    }),

    prisma.user.count({
      where: { role: "ADMIN" },
    }),

    prisma.user.count({
      where: { role: "TEACHER" },
    }),

    prisma.user.count({
      where: { role: "STUDENT" },
    }),

    prisma.employee.count(),

    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        role: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        teacherProfile: {
          select: {
            fullName: true,
            teacherLoginId: true,
          },
        },
        studentProfile: {
          select: {
            fullName: true,
            studentLoginId: true,
          },
        },
        employeeProfile: {
          select: {
            fullName: true,
            employeeLoginId: true,
            role: true,
          },
        },
        adminProfile: {
          select: {
            fullName: true,
          },
        },
      },
    }),

    prisma.section.count({
      where: {
        homeroomTeacherId: {
          not: null,
        },
      },
    }),

    prisma.teacherAssignment.count(),
  ]);

  const staffOnlyCount = Math.max(
    staffCount - teacherCount,
    0
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="overflow-hidden rounded-3xl bg-brand-primary text-white shadow-lg">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Users size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                User Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                View all accounts and access across Level UP Academy.
              </p>
            </div>
          </div>
        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewMetric
            label="Total accounts"
            value={totalUsers}
            icon={Users}
          />

          <OverviewMetric
            label="Active"
            value={activeUsers}
            icon={Activity}
          />

          <OverviewMetric
            label="Inactive"
            value={inactiveUsers}
            icon={UserRound}
          />

          <OverviewMetric
            label="Administrators"
            value={adminCount}
            icon={ShieldCheck}
          />
        </div>
      </section>

      {/* ACCOUNT TYPES */}
      <section>
        <div className="mb-3">
          <h2 className="font-bold text-slate-900">
            Account overview
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            View the different groups of people using the academy system.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AccountCard
            title="Teachers"
            count={teacherCount}
            description="Teacher accounts and academic staff."
            icon={GraduationCap}
            href="/dashboard/admin/teachers"
          />

          <AccountCard
            title="Students"
            count={studentCount}
            description="Student accounts and enrollment records."
            icon={BookOpen}
            href="/dashboard/admin/students"
          />

          <AccountCard
            title="Employees"
            count={staffOnlyCount}
            description="Librarians, health staff, secretaries and other staff."
            icon={UserRoundCheck}
            href="/dashboard/admin/employees"
          />

          <AccountCard
            title="Administrators"
            count={adminCount}
            description="Administrative accounts with system access."
            icon={ShieldCheck}
          />
        </div>
      </section>

      {/* RECENT ACCOUNTS */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">
              Recent accounts
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Recently created user accounts across the academy.
            </p>
          </div>
        </div>

        {recentUsers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No user accounts found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentUsers.map((user) => {
              const name =
                user.teacherProfile?.fullName ??
                user.studentProfile?.fullName ??
                user.employeeProfile?.fullName ??
                user.adminProfile?.fullName ??
                "Unnamed user";

              const loginId =
                user.teacherProfile?.teacherLoginId ??
                user.studentProfile?.studentLoginId ??
                user.employeeProfile?.employeeLoginId ??
                user.email ??
                "—";

              const roleLabel =
                user.role === "LIBRARIAN"
                  ? "Librarian"
                  : user.role === "HEALTH"
                    ? "Health"
                    : user.role.charAt(0) +
                      user.role.slice(1).toLowerCase();

              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <UserRound size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {loginId}
                        {user.email && loginId !== user.email
                          ? ` • ${user.email}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      {roleLabel}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        user.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>

                    <span className="hidden text-xs text-slate-400 sm:block">
                      {formatEthiopianDisplay(user.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ASSIGNMENTS */}
      <section>
        <div className="mb-3">
          <h2 className="font-bold text-slate-900">
            Assignment overview
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            View how teachers are currently assigned across the school.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            title="Homeroom teachers"
            value={homeroomCount}
            description="Sections currently assigned to a homeroom teacher."
            href="/dashboard/admin/sections"
          />

          <InfoCard
            title="Subject assignments"
            value={subjectAssignmentCount}
            description="Teacher-to-subject assignments currently recorded."
            href="/dashboard/admin/sections"
          />
        </div>
      </section>

      {/* PEOPLE LINKS */}
      <section>
        <div className="mb-3">
          <h2 className="font-bold text-slate-900">
            People
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            Open the dedicated area when you need to view detailed records.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <PeopleLink
            title="Teachers"
            href="/dashboard/admin/teachers"
            icon={GraduationCap}
          />

          <PeopleLink
            title="Students"
            href="/dashboard/admin/students"
            icon={BookOpen}
          />

          <PeopleLink
            title="Employees"
            href="/dashboard/admin/employees"
            icon={UserRoundCheck}
          />
        </div>
      </section>
    </div>
  );
}

function OverviewMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="flex items-center gap-3 border-white/10 px-6 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
        <Icon size={17} />
      </div>

      <div>
        <p className="text-xs font-medium text-white/60">
          {label}
        </p>

        <p className="mt-0.5 text-lg font-bold">
          {value}
        </p>
      </div>
    </div>
  );
}

function AccountCard({
  title,
  count,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  count: number;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={20} />
        </div>

        {href && (
          <ArrowRight
            size={18}
            className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-primary"
          />
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <h3 className="font-bold text-slate-900">
          {title}
        </h3>

        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {count}
        </span>
      </div>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>

      {href && (
        <p className="mt-4 text-xs font-bold text-brand-primary">
          View {title}
        </p>
      )}
    </>
  );

  if (!href) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-primary hover:shadow-md"
    >
      {content}
    </Link>
  );
}

function InfoCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <ArrowRight
          size={18}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-primary"
        />
      </div>

      <p className="mt-2 text-sm leading-5 text-slate-500">
        {description}
      </p>

      <p className="mt-4 text-xs font-bold text-brand-primary">
        View assignments
      </p>
    </Link>
  );
}

function PeopleLink({
  title,
  href,
  icon: Icon,
}: {
  title: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={18} />
        </div>

        <span className="text-sm font-bold text-slate-900">
          View {title}
        </span>
      </div>

      <ArrowRight
        size={17}
        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-primary"
      />
    </Link>
  );
}


