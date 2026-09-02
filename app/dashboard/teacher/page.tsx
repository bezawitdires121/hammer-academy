import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  Users,
  UserCircle,
  ArrowRight,
  School,
  Home,
} from "lucide-react";

type TeacherDashboardProps = {
  searchParams: Promise<{
    schoolYearId?: string;
    semesterId?: string;
  }>;
};

export default async function TeacherDashboard({
  searchParams,
}: TeacherDashboardProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const params = await searchParams;

  /*
   * The AcademicSelector stores the selected academic context
   * in the URL:
   *
   * ?schoolYearId=...&semesterId=...
   *
   * If no school year is supplied, fall back to the current
   * school year.
   */
  const requestedSchoolYearId = params.schoolYearId ?? "";

  const selectedSchoolYear = requestedSchoolYearId
    ? await prisma.schoolYear.findUnique({
        where: {
          id: requestedSchoolYearId,
        },
        select: {
          id: true,
          label: true,
          isCurrent: true,
        },
      })
    : await prisma.schoolYear.findFirst({
        where: {
          isCurrent: true,
        },
        select: {
          id: true,
          label: true,
          isCurrent: true,
        },
      });

  const schoolYearId = selectedSchoolYear?.id ?? "";

  const teacherProfile = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
    include: {
      user: true,

      /*
       * IMPORTANT:
       * TeacherAssignment itself does not contain schoolYearId.
       * The academic year comes from assignment.section.schoolYearId.
       */
      subjectAssignments: {
        where: schoolYearId
          ? {
              section: {
                schoolYearId,
              },
            }
          : undefined,
        include: {
          section: {
            include: {
              grade: true,
              schoolYear: true,
              enrollments: {
                where: {
                  status: "ACTIVE",
                },
                include: {
                  student: {
                    select: {
                      id: true,
                      fullName: true,
                      photoUrl: true,
                      studentLoginId: true,
                    },
                  },
                },
              },
            },
          },
          subject: true,
        },
      },

      /*
       * Homeroom assignments also belong to a section,
       * so filter them by the section's school year.
       */
      homeroomSections: {
        where: schoolYearId
          ? {
              schoolYearId,
            }
          : undefined,
        include: {
          grade: true,
          schoolYear: true,
          enrollments: {
            where: {
              status: "ACTIVE",
            },
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  photoUrl: true,
                  studentLoginId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacherProfile) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
        <h1 className="text-lg font-bold text-red-800">
          Teacher Profile Not Found
        </h1>

        <p className="mt-2 text-sm text-red-700">
          Your account is logged in, but no teacher profile is connected to
          your account. Please contact an administrator.
        </p>
      </div>
    );
  }

  /*
   * These assignments are now already restricted to the
   * selected school year.
   */
  const assignments = teacherProfile.subjectAssignments;

  /*
   * Get unique sections from the selected year's subject assignments.
   */
  const sectionMap = new Map<
    string,
    (typeof assignments)[number]["section"]
  >();

  for (const assignment of assignments) {
    sectionMap.set(assignment.section.id, assignment.section);
  }

  const assignedSections = Array.from(sectionMap.values());

  /*
   * Count unique students across all selected-year assigned sections.
   */
  const uniqueStudentIds = new Set<string>();

  for (const section of assignedSections) {
    for (const enrollment of section.enrollments) {
      uniqueStudentIds.add(enrollment.studentId);
    }
  }

  /*
   * Homeroom students for the selected school year.
   */
  const homeroomStudentIds = new Set<string>();

  for (const section of teacherProfile.homeroomSections) {
    for (const enrollment of section.enrollments) {
      homeroomStudentIds.add(enrollment.studentId);
    }
  }

  const totalStudents = uniqueStudentIds.size;

  /*
   * Preserve the selected academic context when navigating
   * to pages that support it.
   */
  const contextQuery =
    schoolYearId && params.semesterId
      ? `?schoolYearId=${encodeURIComponent(
          schoolYearId
        )}&semesterId=${encodeURIComponent(params.semesterId)}`
      : schoolYearId
        ? `?schoolYearId=${encodeURIComponent(schoolYearId)}`
        : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl bg-brand-primary shadow-lg">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-accent/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {teacherProfile.photoUrl ? (
                <img
                  src={teacherProfile.photoUrl}
                  alt={teacherProfile.fullName}
                  className="h-20 w-20 rounded-2xl border-2 border-brand-accent/50 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-accent text-2xl font-black text-brand-primary shadow-lg">
                  {teacherProfile.fullName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-white/60">
                  Welcome back
                </p>

                <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  {teacherProfile.fullName}
                </h1>

                <p className="mt-1 text-sm text-white/60">
                  Teacher Dashboard
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/teacher/profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-bold text-brand-primary transition hover:brightness-105"
            >
              <UserCircle size={18} strokeWidth={2.5} />
              My Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Subjects"
          value={assignments.length}
          icon={BookOpen}
          description={
            selectedSchoolYear
              ? `Subjects you teach in ${selectedSchoolYear.label} E.C.`
              : "Subjects you teach"
          }
        />

        <StatCard
          title="Assigned Sections"
          value={assignedSections.length}
          icon={School}
          description={
            selectedSchoolYear
              ? `Sections you teach in ${selectedSchoolYear.label} E.C.`
              : "Sections you teach"
          }
        />

        <StatCard
          title="Students"
          value={totalStudents}
          icon={Users}
          description="Students in your selected-year sections"
        />

        <StatCard
          title="Results"
          value="Manage"
          icon={ClipboardCheck}
          description="Enter and update marks"
          href={`/dashboard/teacher/results${contextQuery}`}
        />
      </section>

      {/* Homeroom */}
      {teacherProfile.homeroomSections.length > 0 && (
        <section className="rounded-2xl border border-brand-accent/30 bg-brand-accent/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent/15 text-brand-primary">
              <Home size={21} strokeWidth={2.2} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Homeroom Teacher
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                You are the homeroom teacher for:
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {teacherProfile.homeroomSections.map((section) => (
                  <span
                    key={section.id}
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brand-primary shadow-sm"
                  >
                    Grade {section.grade.level}
                    {section.label} · {section.schoolYear.label}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Homeroom students: {homeroomStudentIds.size}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Common tasks for your teaching work.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href={`/dashboard/teacher/results${contextQuery}`}
            icon={ClipboardCheck}
            title="Enter Results"
            description="Enter and manage student marks."
          />

          <QuickAction
            href={`/dashboard/teacher/students${contextQuery}`}
            icon={Users}
            title="My Students"
            description="View students in your sections."
          />

          <QuickAction
            href={`/dashboard/teacher/homework${contextQuery}`}
            icon={BookOpen}
            title="Homework"
            description="Create and manage homework."
          />

          <QuickAction
            href={`/dashboard/teacher/attendance${contextQuery}`}
            icon={CalendarCheck}
            title="Attendance"
            description="Record student attendance."
          />
        </div>
      </section>

      {/* Assigned Subjects */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Your Subjects
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Subjects and sections currently assigned to you
              {selectedSchoolYear
                ? ` for ${selectedSchoolYear.label} E.C.`
                : "."}
            </p>
          </div>

          <Link
            href={`/dashboard/teacher/results${contextQuery}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"
          >
            View results
            <ArrowRight size={15} />
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />

            <h3 className="mt-3 font-semibold text-gray-900">
              No subjects assigned for this school year
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              An administrator needs to assign subjects to your account for
              this school year.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                    <BookOpen size={21} strokeWidth={2.2} />
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">
                      {assignment.subject.name}
                    </p>

                    <p className="mt-0.5 text-sm text-gray-500">
                      Grade {assignment.section.grade.level}
                      {assignment.section.label} ·{" "}
                      {assignment.section.schoolYear.label}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/teacher/results/${assignment.sectionId}/${assignment.subjectId}${contextQuery ? `&${contextQuery.slice(1)}` : ""}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
                >
                  Enter Marks
                  <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Assigned Sections */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-900">
            Your Sections
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Sections connected to your teaching assignments
            {selectedSchoolYear
              ? ` for ${selectedSchoolYear.label} E.C.`
              : "."}
          </p>
        </div>

        {assignedSections.length === 0 ? (
          <div className="p-8 text-center">
            <School className="mx-auto h-10 w-10 text-gray-300" />

            <h3 className="mt-3 font-semibold text-gray-900">
              No sections assigned for this school year
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Your sections will appear here after an administrator assigns
              subjects to you for this school year.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {assignedSections.map((section) => {
              const sectionAssignments = assignments.filter(
                (assignment) => assignment.sectionId === section.id
              );

              return (
                <div
                  key={section.id}
                  className="rounded-xl border border-gray-200 p-5 transition hover:border-brand-accent/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Grade {section.grade.level}
                        {section.label}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        School Year {section.schoolYear.label}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                      <GraduationCap size={20} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <Users size={16} />
                    {section.enrollments.length}{" "}
                    {section.enrollments.length === 1
                      ? "student"
                      : "students"}
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Your subjects
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {sectionAssignments.map((assignment) => (
                        <span
                          key={assignment.id}
                          className="rounded-full bg-brand-bg px-3 py-1 text-xs font-semibold text-brand-primary"
                        >
                          {assignment.subject.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <p className="mt-2 text-2xl font-black text-gray-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <Icon size={21} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
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

      <p className="mt-1 text-sm leading-5 text-gray-500">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-brand-primary">
        Open
        <ArrowRight size={14} />
      </div>
    </Link>
  );
}