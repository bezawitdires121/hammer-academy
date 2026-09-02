import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  ClipboardPlus,
  Clock3,
  HeartPulse,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

export default async function HealthPage() {
  await requireRole(["HEALTH", "ADMIN"]);
  const session = await auth();

  const employee = await prisma.employee.findFirst({
    where: { userId: session!.user!.id },
  });

  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const todayEnd = new Date(
    todayStart.getTime() + 24 * 60 * 60 * 1000
  );

  const [totalStudents, visitsToday, followUpsToday, totalConditions, recentVisits, upcomingFollowUps] =
    await Promise.all([
      prisma.student.count(),

      prisma.healthVisit.count({
        where: {
          visitDate: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),

      prisma.healthVisit.count({
        where: {
          followUpAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),

      prisma.healthCondition.count(),

      prisma.healthVisit.findMany({
        include: {
          student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } },
        },
        orderBy: {
          visitDate: "desc",
        },
        take: 6,
      }),

      prisma.healthVisit.findMany({
        where: {
          followUpAt: {
            gte: todayStart,
          },
        },
        include: {
          student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } },
        },
        orderBy: {
          followUpAt: "asc",
        },
        take: 6,
      }),
    ]);

  const formattedDate = formatEthiopianDisplay(now);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="overflow-hidden rounded-2xl bg-brand-primary text-white shadow-lg">
        <div className="flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <HeartPulse size={16} />
              School Health Office
            </div>

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Good day, {employee?.fullName ?? "Health Staff"}
            </h1>

            <p className="mt-2 text-sm text-white/75">
              Manage student wellness, health visits, conditions, and
              follow-ups.
            </p>
          </div>

          <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">
              Today
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formattedDate}
            </p>
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={totalStudents}
          description="Students in the school"
          icon={Users}
          iconClass="bg-slate-100 text-brand-primary"
        />

        <StatCard
          label="Visits Today"
          value={visitsToday}
          description="Health office visits"
          icon={Activity}
          iconClass="bg-green-100 text-green-700"
        />

        <StatCard
          label="Follow-ups Today"
          value={followUpsToday}
          description="Students requiring follow-up"
          icon={CalendarCheck}
          iconClass="bg-amber-100 text-amber-700"
        />

        <StatCard
          label="Health Conditions"
          value={totalConditions}
          description="Recorded student conditions"
          icon={ShieldAlert}
          iconClass="bg-red-100 text-red-700"
        />
      </section>

      {/* QUICK ACTIONS */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900">
            Quick actions
          </h2>
          <p className="text-sm text-slate-500">
            Common tasks for the health office.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction
            href="/dashboard/employee/health/visits?record=1"
            icon={ClipboardPlus}
            title="Record Health Visit"
            description="Record a new student health visit."
            primary
          />

          <QuickAction
            href="/dashboard/employee/health/students"
            icon={Search}
            title="Find Student"
            description="Search student health records and history."
          />
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* FOLLOW UPS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Upcoming follow-ups
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Students requiring continued attention
              </p>
            </div>

            <CalendarCheck className="text-amber-600" size={20} />
          </div>

          {upcomingFollowUps.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CalendarCheck className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No upcoming follow-ups
              </p>
              <p className="mt-1 text-xs text-slate-400">
                The health office has no scheduled follow-ups.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingFollowUps.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/dashboard/employee/health/students/${visit.student.id}`}
                  className="block px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {visit.student.fullName}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {visit.reason ?? "Health follow-up"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
                      <Clock3 size={13} />
                      {visit.followUpAt ? formatEthiopianDisplay(visit.followUpAt) : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* RECENT VISITS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Recent health visits
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Latest activity in the health office
              </p>
            </div>

            <Link
              href="/dashboard/employee/health/visits"
              className="flex items-center gap-1 text-sm font-semibold text-brand-primary"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>

          {recentVisits.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Activity className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No visits recorded
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Health office activity will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/dashboard/employee/health/students/${visit.student.id}`}
                  className="block px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                        <HeartPulse size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {visit.student.fullName}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {visit.reason ?? "Health office visit"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-slate-400">
                        {formatEthiopianDisplay(visit.visitDate)}
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-brand-primary">
                        View record
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* FOOTER ACTIONS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Health office tools
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Access student records and the complete visit history.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/employee/health/students"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Users size={16} />
              Students
            </Link>

            <Link
              href="/dashboard/employee/health/visits"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
            >
              <Activity size={16} />
              Visit History
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition ${
        primary
          ? "border-brand-primary bg-brand-primary text-white shadow-sm hover:opacity-95"
          : "border-slate-200 bg-white text-slate-900 shadow-sm hover:border-brand-primary hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            primary
              ? "bg-white/10 text-white"
              : "bg-brand-primary/10 text-brand-primary"
          }`}
        >
          <Icon size={20} />
        </div>

        <div>
          <p
            className={`font-bold ${
              primary ? "text-white" : "text-slate-900"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-0.5 text-sm ${
              primary ? "text-white/70" : "text-slate-500"
            }`}
          >
            {description}
          </p>
        </div>

        <ArrowRight
          size={17}
          className={`ml-auto transition-transform group-hover:translate-x-1 ${
            primary ? "text-white/70" : "text-slate-400"
          }`}
        />
      </div>
    </Link>
  );
}





