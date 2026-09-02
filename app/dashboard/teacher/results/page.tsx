
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{
    schoolYearId?: string;
    semesterId?: string;
  }>;
};

export default async function TeacherResultsOverviewPage({
  searchParams,
}: Props) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherProfile = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      fullName: true,
      status: true,
    },
  });

  if (!teacherProfile || teacherProfile.status !== "ACTIVE") {
    redirect("/unauthorized");
  }

  const params = await searchParams;

  /*
   * Resolve the school year.
   *
   * If a school year is supplied, use it.
   * Otherwise use the current school year.
   */
  const schoolYear = params.schoolYearId
    ? await prisma.schoolYear.findUnique({
        where: {
          id: params.schoolYearId,
        },
        select: {
          id: true,
          label: true,
        },
      })
    : await prisma.schoolYear.findFirst({
        where: {
          isCurrent: true,
        },
        select: {
          id: true,
          label: true,
        },
      });

  if (!schoolYear) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/teacher"
          className="text-sm font-semibold text-slate-500 transition hover:text-brand-primary"
        >
          ← Back to dashboard
        </Link>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-black text-slate-900">
            No school year available
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There is currently no school year configured for results.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Load semesters belonging ONLY to the selected school year.
   */
  const semesters = await prisma.semester.findMany({
    where: {
      schoolYearId: schoolYear.id,
    },
    select: {
      id: true,
      name: true,
      number: true,
      isLocked: true,
    },
    orderBy: {
      number: "asc",
    },
  });

  /*
   * Use the requested semester when valid.
   * Otherwise use the first semester in the selected school year.
   */
  const selectedSemester =
    semesters.find(
      (semester) => semester.id === params.semesterId
    ) ?? semesters[0] ?? null;

  /*
   * A teacher can access results for:
   *
   * 1. Sections where they teach a subject.
   * 2. Sections where they are the homeroom teacher.
   *
   * IMPORTANT:
   * Sections are restricted to the selected school year.
   */
  const sections = await prisma.section.findMany({
    where: {
      schoolYearId: schoolYear.id,
      OR: [
        {
          subjectAssignments: {
            some: {
              teacherId: teacherProfile.id,
            },
          },
        },
        {
          homeroomTeacherId: teacherProfile.id,
        },
      ],
    },
    include: {
      grade: true,
      schoolYear: true,

      enrollments: {
        where: {
          status: "ACTIVE",
        },
        select: {
          studentId: true,
        },
      },

      subjectAssignments: {
        where: {
          teacherId: teacherProfile.id,
        },
        include: {
          subject: true,
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
      },
    },
    orderBy: [
      {
        grade: {
          level: "asc",
        },
      },
      {
        label: "asc",
      },
    ],
  });

  const buildSubjectHref = (
    sectionId: string,
    subjectId: string
  ) => {
    const query = new URLSearchParams();

    query.set("schoolYearId", schoolYear.id);

    if (selectedSemester) {
      query.set("semesterId", selectedSemester.id);
    }

    return `/dashboard/teacher/results/${sectionId}/${subjectId}?${query.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/teacher"
          className="text-sm font-semibold text-slate-500 transition hover:text-brand-primary"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-3">
          <p className="text-sm font-semibold text-brand-primary">
            Teaching
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight text-brand-primary">
            Results
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Select a subject to enter, review, or update student results.
          </p>
        </div>
      </div>

      {/* Academic period */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              School Year
            </p>

            <div className="mt-1 font-black text-slate-900">
              {schoolYear.label}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Semester
            </p>

            {selectedSemester ? (
              <div className="mt-1 font-black text-slate-900">
                {selectedSemester.name}
              </div>
            ) : (
              <div className="mt-1 font-semibold text-slate-500">
                No semester configured
              </div>
            )}
          </div>
        </div>

        {semesters.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {semesters.map((semester) => {
              const query = new URLSearchParams();

              query.set("schoolYearId", schoolYear.id);
              query.set("semesterId", semester.id);

              const active =
                selectedSemester?.id === semester.id;

              return (
                <Link
                  key={semester.id}
                  href={`/dashboard/teacher/results?${query.toString()}`}
                  className={
                    active
                      ? "rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white"
                      : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  }
                >
                  {semester.name}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-black text-slate-900">
            No sections assigned
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            You currently do not have any sections or subjects assigned to
            you for {schoolYear.label}.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const studentCount = section.enrollments.length;

            return (
              <section
                key={section.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Section header */}
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Grade {section.grade.level}
                        {section.label}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        School Year {section.schoolYear.label} ·{" "}
                        {studentCount}{" "}
                        {studentCount === 1
                          ? "student"
                          : "students"}
                      </p>
                    </div>

                    {section.homeroomTeacherId ===
                      teacherProfile.id && (
                      <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        Homeroom Teacher
                      </span>
                    )}
                  </div>
                </div>

                {/* Subjects */}
                <div className="p-5">
                  {section.subjectAssignments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="font-bold text-slate-700">
                        No subjects assigned
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        There are currently no subjects assigned to you for
                        this section.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {section.subjectAssignments.map((assignment) => (
                        <Link
                          key={assignment.id}
                          href={buildSubjectHref(
                            section.id,
                            assignment.subjectId
                          )}
                          className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-primary hover:bg-slate-50 hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Subject
                              </p>

                              <h3 className="mt-1 font-black text-slate-900">
                                {assignment.subject.name}
                              </h3>
                            </div>

                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary transition group-hover:bg-brand-primary group-hover:text-white">
                              →
                            </span>
                          </div>

                          <p className="mt-3 text-xs text-slate-500">
                            {selectedSemester?.isLocked
                              ? "Results locked for this semester"
                              : "Click to view and manage results"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}






