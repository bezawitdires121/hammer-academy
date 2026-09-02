import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  ArrowRight,
  UserCircle,
  Users,
  Library,
  HeartPulse,
} from "lucide-react";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      enrollments: {
        include: {
          section: { include: { grade: true, schoolYear: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
        <h1 className="text-lg font-bold text-red-800">Profile Not Found</h1>
        <p className="mt-2 text-sm text-red-700">
          No student profile is connected to your account. Contact an administrator.
        </p>
      </div>
    );
  }

  const enrollment = student.enrollments[0];
  const section = enrollment?.section;
  // Only count unread result notifications for the student's
  // current school year and current semester.
  // Announcement notifications must not appear as "new results".
  const currentSchoolYearId = section?.schoolYearId ?? null;

  const currentSemester = currentSchoolYearId
    ? await prisma.semester.findFirst({
        where: {
          schoolYearId: currentSchoolYearId,
          isCurrent: true,
        },
        select: {
          id: true,
        },
      })
    : null;

  const unreadNotifications =
    currentSchoolYearId && currentSemester
      ? await prisma.notification.count({
          where: {
            userId: session.user.id,
            channel: "IN_APP",
            status: "SENT",
            readAt: null,
            schoolYearId: currentSchoolYearId,
            semesterId: currentSemester.id,
            OR: [
              { title: { contains: "result", mode: "insensitive" } },
              { title: { contains: "results", mode: "insensitive" } },
            ],
          },
        })
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl bg-brand-primary shadow-lg">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-accent/10" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photoUrl}
                  alt={student.fullName}
                  className="h-20 w-20 rounded-2xl border-2 border-brand-accent/50 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-accent text-2xl font-black text-brand-primary shadow-lg">
                  {student.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
               
                <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  {student.fullName}
                </h1>
                <p className="mt-1 font-mono text-sm text-white/60">
                  ID: {student.studentLoginId}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/student/profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-bold text-brand-primary transition hover:brightness-105"
            >
              <UserCircle size={18} strokeWidth={2.5} />
              My Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Current enrollment */}
      {section && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Enrollment
              </p>
              <p className="mt-0.5 font-bold text-slate-900">
                Grade {section.grade.level} - Section {section.label}
              </p>
              <p className="text-sm text-slate-500">{section.schoolYear.label}</p>
            </div>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {unreadNotifications > 0 && (
          <Link
            href="/dashboard/student/results"
            className="sm:col-span-2 lg:col-span-3 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm"
          >
            <div>
              <p className="font-bold text-blue-900">
                New results available
              </p>
              <p className="mt-1 text-sm text-blue-700">
                You have {unreadNotifications} new result{unreadNotifications === 1 ? "" : "s"} released.
              </p>
            </div>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-blue-600 px-2 text-sm font-black text-white">
              {unreadNotifications}
            </span>
          </Link>
        )}
        <QuickAction
          href="/dashboard/student/results"
          icon={ClipboardCheck}
          title="My Results"
          description="View your exam results and report cards."
        />
        <QuickAction
          href="/dashboard/student/attendance"
          icon={CalendarCheck}
          title="Attendance"
          description="Check your attendance record."
        />
        <QuickAction
          href="/dashboard/student/homework"
          icon={BookOpen}
          title="Homework"
          description="View assigned homework and assessments."
        />
        <QuickAction
          href="/dashboard/student/club"
          icon={Users}
          title="My Club"
          description="View your club membership and role."
        />
        <QuickAction
          href="/dashboard/student/library"
          icon={Library}
          title="Library"
          description="View borrowed books and due dates."
        />
        <QuickAction
          href="/dashboard/student/health"
          icon={HeartPulse}
          title="Health"
          description="View your health records and visits."
        />
      </section>

    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-accent/50 hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition group-hover:bg-brand-primary group-hover:text-white">
        <Icon size={21} strokeWidth={2.2} />
      </div>
      <h3 className="mt-4 font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-brand-primary">
        Open <ArrowRight size={14} />
      </div>
    </Link>
  );
}









