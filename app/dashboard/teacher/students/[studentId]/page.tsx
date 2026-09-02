import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Mail,
  Phone,
  User,
  Users,
} from "lucide-react";
import { buildClassNumberMap } from "@/lib/class-number";

export default async function TeacherStudentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { studentId } = await params;
  const paramsQuery = await searchParams;
  const selectedSchoolYearId =
    typeof paramsQuery.schoolYearId === "string"
      ? paramsQuery.schoolYearId
      : undefined
  const selectedSemesterId =
    typeof paramsQuery.semesterId === "string"
      ? paramsQuery.semesterId
      : undefined
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!teacher) {
    redirect("/unauthorized");
  }

  const currentSchoolYear = await prisma.schoolYear.findFirst({
    where: selectedSchoolYearId
      ? { id: selectedSchoolYearId }
      : { isCurrent: true },
  });

  if (!currentSchoolYear) {
    redirect("/unauthorized");
  }

  const selectedSemester = await prisma.semester.findFirst({
    where: selectedSemesterId
      ? {
          id: selectedSemesterId,
          schoolYearId: currentSchoolYear.id,
        }
      : {
          schoolYearId: currentSchoolYear.id,
          isCurrent: true,
        },
    select: {
      id: true,
      name: true,
      number: true,
    },
  });

  if (!selectedSemester) {
    redirect("/unauthorized");
  }


  /*
   * SECURITY
   *
   * A teacher may only view a student if:
   *
   * 1. They are the homeroom teacher of the student's section, OR
   * 2. They teach at least one subject in the student's section.
   *
   * The section is determined through the student's ACTIVE
   * enrollment for the current school year.
   */
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      enrollments: {
        some: {
          schoolYearId: currentSchoolYear.id,
          status: "ACTIVE",
          section: {
            OR: [
              {
                homeroomTeacherId: teacher.id,
              },
              {
                subjectAssignments: {
                  some: {
                    teacherId: teacher.id,
                  },
                },
              },
            ],
          },
        },
      },
    },
    include: {
      enrollments: {
        where: {
          schoolYearId: currentSchoolYear.id,
          status: "ACTIVE",
        },
        include: {
          section: {
            include: {
              grade: true,
              subjectAssignments: {
                where: {
                  teacherId: teacher.id,
                },
                include: {
                  subject: true,
                },
              },
            },
          },
        },
      },
      parentContacts: true,
    },
  });

  if (!student || student.enrollments.length === 0) {
    redirect("/unauthorized");
  }

  const enrollment = student.enrollments[0];
  const section = enrollment.section;

  const isClassTeacher = section.homeroomTeacherId === teacher.id;

  // Load the full section roster to compute this student's Class No.
  const sectionRoster = await prisma.studentEnrollment.findMany({
    where: { sectionId: section.id, status: "ACTIVE" },
    select: { student: { select: { id: true, fullName: true } } },
  });
  const classNumberMap = buildClassNumberMap(
    sectionRoster.map((e) => e.student)
  );
  const classNo = classNumberMap.get(student.id) ?? null;

  const assignedSubjects = section.subjectAssignments.map(
    (assignment) => assignment.subject
  );

  /*
   * RESULT VISIBILITY RULES
   *
   * Homeroom teacher â†’ can see submitted results for ALL subjects
   *   in their section (via SemesterSubjectSubmission).
   *
   * Subject teacher â†’ can only see results for their own
   *   assigned subject(s) in this section.
   */
  const assignedSubjectIds = new Set(
    section.subjectAssignments.map((a) => a.subject.id)
  );

  // For homeroom: load submitted semester results across all subjects
  const semesterSubmissions = isClassTeacher
    ? await prisma.semesterSubjectSubmission.findMany({
        where: {
          sectionId: section.id,
          semesterId: selectedSemester.id,
        },
        include: {
          subject: true,
          results: {
            where: { studentId: student.id },
          },
        },
        orderBy: { subject: { name: "asc" } },
      })
    : [];

  // For subject teacher: load only their assigned subjects' results
  const subjectResultCards = !isClassTeacher && assignedSubjectIds.size > 0
    ? await prisma.resultCard.findMany({
        where: {
          studentId: student.id,
          exam: {
            semesterId: selectedSemester.id,
            subjectId: { in: [...assignedSubjectIds] },
          },
        },
        include: {
          exam: true,
          results: {
            where: { subjectId: { in: [...assignedSubjectIds] } },
            include: { subject: true },
          },
        },
        orderBy: { exam: { createdAt: "desc" } },
      })
    : [];

  // Homeroom sees submitted /100 totals per subject
  const homeroomResults = semesterSubmissions
    .map((sub) => {
      const studentResult = sub.results[0];
      if (!studentResult) return null;
      return {
        id: sub.id,
        subject: sub.subject.name,
        marks: studentResult.marksObtained,
        maxMarks: studentResult.maxMarks,
        grade: null as string | null,
        exam: `${selectedSemester.name} (submitted)`,
        status: "PUBLISHED" as const,
        examDate: null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Subject teacher sees individual assessment results for their subject only
  const subjectTeacherResults = subjectResultCards.flatMap((card) =>
    card.results.map((result) => ({
      id: result.id,
      subject: result.subject.name,
      marks: result.marksObtained,
      maxMarks: result.maxMarks,
      grade: result.grade,
      exam: card.exam.name,
      status: card.status,
      examDate: null,
    }))
  );

  const allResults = isClassTeacher ? homeroomResults : subjectTeacherResults;

  const totalMarks = allResults.reduce(
    (total, result) => total + result.marks,
    0
  );

  const totalMaximum = allResults.reduce(
    (total, result) => total + result.maxMarks,
    0
  );

  const overallPercentage =
    totalMaximum > 0 ? (totalMarks / totalMaximum) * 100 : null;

  const initials = student.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-8">
      {/* Back */}
      <div>
        <Link
          href="/dashboard/teacher/students"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-primary"
        >
          <ArrowLeft size={17} />
          Back to My Students
        </Link>
      </div>

      {/* Student header */}
      {/* Student header */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand-primary/10">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-black text-brand-primary">
                    {initials}
                  </div>
                )}
              </div>

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    {student.fullName}
                  </h1>

                  {isClassTeacher && (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">
                      Class Teacher
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Class No.{" "}
                  <span className="font-bold text-slate-700">
                    {classNo ?? "—"}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-5 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Section
              </p>

              <p className="mt-1 font-black text-brand-primary">
                {section.label}
              </p>

              <p className="text-xs text-slate-500">
                Grade {section.grade.level}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick statistics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BookOpen size={20} />
            </div>

            <span className="text-xs font-bold text-slate-400">
              Assigned
            </span>
          </div>

          <p className="mt-4 text-2xl font-black text-slate-900">
            {assignedSubjects.length}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Subject{assignedSubjects.length === 1 ? "" : "s"} you teach
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <ClipboardCheck size={20} />
            </div>

            <span className="text-xs font-bold text-slate-400">
              Results
            </span>
          </div>

          <p className="mt-4 text-2xl font-black text-slate-900">
            {allResults.length}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Result entries
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <GraduationCap size={20} />
            </div>

            <span className="text-xs font-bold text-slate-400">
              Average
            </span>
          </div>

          <p className="mt-4 text-2xl font-black text-slate-900">
            {overallPercentage !== null
              ? `${overallPercentage.toFixed(1)}%`
              : "â€”"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Overall recorded marks
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Users size={20} />
            </div>

            <span className="text-xs font-bold text-slate-400">
              Family
            </span>
          </div>

          <p className="mt-4 text-2xl font-black text-slate-900">
            {student.parentContacts.length}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Linked contact{student.parentContacts.length === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-6 lg:col-span-2">
          {/* Subjects */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <BookOpen size={20} />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  My Subjects
                </h2>

                <p className="text-xs text-slate-500">
                  Subjects you are assigned to teach this student
                </p>
              </div>
            </div>

            {assignedSubjects.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                You are not assigned to a specific subject in this section.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {assignedSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-900">
                      {subject.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Assigned subject
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Results */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <ClipboardCheck size={20} />
                </div>

                <div>
                  <h2 className="font-black text-slate-900">
                    Results
                  </h2>

                  <p className="text-xs text-slate-500">
                    Recorded academic results
                  </p>
                </div>
              </div>
            </div>

            {allResults.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  No results have been entered yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allResults.map((result) => {
                  const percentage =
                    result.maxMarks > 0
                      ? (result.marks / result.maxMarks) * 100
                      : 0;

                  return (
                    <div
                      key={result.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {result.subject}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {result.exam}
                        </p>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="font-black text-slate-900">
                            {result.marks}/{result.maxMarks}
                          </p>

                          <p className="text-xs text-slate-400">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>

                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                          {result.grade}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                            result.status === "PUBLISHED"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {result.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Student information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <User size={19} />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  Student Information
                </h2>

                <p className="text-xs text-slate-500">
                  Basic academic information
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Full Name
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {student.fullName}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Class No.
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {classNo ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Section
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {section.label}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Grade
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  Grade {section.grade.level}
                </p>
              </div>
            </div>
          </section>

          {/* Parents / Guardians */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Users size={19} />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  Parent / Guardian
                </h2>

                <p className="text-xs text-slate-500">
                  Linked family contacts
                </p>
              </div>
            </div>

            {student.parentContacts.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">
                No parent or guardian is linked to this student.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {student.parentContacts.map((parent) => (
                  <div
                    key={parent.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-900">
                      {parent.fullName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {parent.relationship}
                    </p>

                    {parent.phone && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                        <Phone size={14} />
                        <span>{parent.phone}</span>
                      </div>
                    )}

                    {parent.email && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <Mail size={14} />
                        <span className="break-all">
                          {parent.email}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}



