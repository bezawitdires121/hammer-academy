import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireStudent } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Info,
  NotebookPen,
} from "lucide-react";

const levelColors: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-700 border-green-200",
  VERY_GOOD: "bg-blue-100 text-blue-700 border-blue-200",
  GOOD: "bg-sky-100 text-sky-700 border-sky-200",
  DONE: "bg-slate-100 text-slate-700 border-slate-200",
  NOT_DONE: "bg-red-100 text-red-700 border-red-200",
};

const sourceLabels: Record<string, string> = {
  TEXTBOOK: "Textbook",
  CLASSWORK: "Classwork",
  OTHER: "Other",
};

function formatDate(date: Date) {
  return formatEthiopianDisplay(new Date(date));
}

function DetailBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-primary" />
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>

      <div className="mt-2 text-sm leading-6 text-slate-700">
        {children}
      </div>
    </div>
  );
}

export default async function StudentHomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{
    schoolYearId?: string;
    semesterId?: string;
  }>;
}) {
  const session = await requireStudent();

  const params = await searchParams;
  const requestedSchoolYearId = params.schoolYearId ?? "";
  const requestedSemesterId = params.semesterId ?? "";

  const student = await prisma.student.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!student) return null;

  // Resolve the academic context from the global dashboard selector.
  // If the URL has no context yet, use the current school year and
  // its first semester so the student page behaves consistently with
  // the selector defaults.
  const schoolYear =
    (requestedSchoolYearId
      ? await prisma.schoolYear.findUnique({
          where: {
            id: requestedSchoolYearId,
          },
          select: {
            id: true,
            isCurrent: true,
            semesters: {
              orderBy: {
                number: "asc",
              },
              select: {
                id: true,
                number: true,
              },
            },
          },
        })
      : await prisma.schoolYear.findFirst({
          where: {
            isCurrent: true,
          },
          select: {
            id: true,
            isCurrent: true,
            semesters: {
              orderBy: {
                number: "asc",
              },
              select: {
                id: true,
                number: true,
              },
            },
          },
        })) ??
    (await prisma.schoolYear.findFirst({
      orderBy: {
        startDate: "desc",
      },
      select: {
        id: true,
        isCurrent: true,
        semesters: {
          orderBy: {
            number: "asc",
          },
          select: {
            id: true,
            number: true,
          },
        },
      },
    }));

  const selectedSemester =
    schoolYear?.semesters.find(
      (semester) => semester.id === requestedSemesterId
    ) ??
    schoolYear?.semesters.find(
      (semester) => semester.number === 1
    ) ??
    schoolYear?.semesters[0] ??
    null;

  const selectedSchoolYearId = schoolYear?.id ?? null;
  const selectedSemesterId = selectedSemester?.id ?? null;

  const enrollments =
    selectedSchoolYearId
      ? await prisma.studentEnrollment.findMany({
          where: {
            studentId: student.id,
            status: "ACTIVE",
            section: {
              schoolYearId: selectedSchoolYearId,
            },
          },
          select: {
            sectionId: true,
          },
        })
      : [];

  const sectionIds = enrollments.map(
    (enrollment) => enrollment.sectionId
  );

  const homework =
    sectionIds.length === 0 || !selectedSemesterId
      ? []
      : await prisma.homework.findMany({
          where: {
            sectionId: {
              in: sectionIds,
            },
            semesterId: selectedSemesterId,
          },
          orderBy: { createdAt: "desc" },

          include: {
            subject: true,
            teacher: true,
            section: {
              include: {
                grade: true,
                schoolYear: true,
              },
            },
            assessments: {
              where: {
                studentId: student.id,
              },
            },
          },
          take: 40,
        });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10">
            <BookOpen className="h-5 w-5 text-brand-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Homework
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Everything your teachers have assigned to you.
            </p>
          </div>
        </div>
      </section>

      {/* Empty state */}
      {homework.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-semibold text-slate-900">
            No homework yet
          </h2>

          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Homework assigned by your teachers will appear here with
            all the instructions and details you need.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {homework.map((hw) => {
            const assessment = hw.assessments[0];

            return (
              <article
                key={hw.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Homework header */}
                <div className="border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-bold text-brand-primary">
                          {hw.subject.name}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                          {sourceLabels[hw.source] ?? hw.source}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-bold text-slate-900">
                        {hw.title}
                      </h2>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>
                          Teacher:{" "}
                          <span className="font-medium text-slate-700">
                            {hw.teacher.fullName}
                          </span>
                        </span>

                        <span>
                          Class:{" "}
                          <span className="font-medium text-slate-700">
                            Grade {hw.section.grade.level}
                            {hw.section.label}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Assessment */}
                    {assessment ? (
                      <div
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                          levelColors[assessment.level] ??
                          "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {assessment.level.replaceAll("_", " ")}
                      </div>
                    ) : (
                      <div className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                        Not assessed
                      </div>
                    )}
                  </div>
                </div>

                {/* Main homework details */}
                <div className="space-y-6 p-5 sm:p-6">
                  {/* Dates */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailBlock
                      icon={CalendarDays}
                      label="Assigned"
                    >
                      {formatDate(hw.assignedDate)}
                    </DetailBlock>

                    <DetailBlock
                      icon={CalendarDays}
                      label="Due date"
                    >
                      {hw.dueDate ? (
                        formatDate(hw.dueDate)
                      ) : (
                        <span className="text-slate-400">
                          No due date specified
                        </span>
                      )}
                    </DetailBlock>
                  </div>

                  {/* Instructions */}
                  {hw.instructions && (
                    <DetailBlock
                      icon={ClipboardList}
                      label="Teacher's instructions"
                    >
                      <p className="whitespace-pre-wrap">
                        {hw.instructions}
                      </p>
                    </DetailBlock>
                  )}

                  {/* Source information */}
                  {(hw.textbookName ||
                    hw.pageNumber ||
                    hw.exercises ||
                    hw.sourceNote) && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4 text-brand-primary" />

                        <h3 className="text-sm font-bold text-slate-900">
                          Assignment details
                        </h3>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {hw.textbookName && (
                          <DetailBlock
                            icon={BookOpen}
                            label="Textbook"
                          >
                            {hw.textbookName}
                          </DetailBlock>
                        )}

                        {hw.pageNumber && (
                          <DetailBlock
                            icon={FileText}
                            label="Page"
                          >
                            {hw.pageNumber}
                          </DetailBlock>
                        )}

                        {hw.exercises && (
                          <div className="sm:col-span-2">
                            <DetailBlock
                              icon={NotebookPen}
                              label="Exercises"
                            >
                              <p className="whitespace-pre-wrap">
                                {hw.exercises}
                              </p>
                            </DetailBlock>
                          </div>
                        )}

                        {hw.sourceNote && (
                          <div className="sm:col-span-2">
                            <DetailBlock
                              icon={Info}
                              label="Teacher's note"
                            >
                              <p className="whitespace-pre-wrap">
                                {hw.sourceNote}
                              </p>
                            </DetailBlock>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assessment */}
                  {assessment && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />

                        <h3 className="font-bold text-green-900">
                          Teacher assessment
                        </h3>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-green-800">
                        {assessment.level.replaceAll("_", " ")}
                      </p>

                      {assessment.note && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-green-800">
                          {assessment.note}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {hw.section.schoolYear.label}
                    </span>

                    <span>
                      {hw.subject.name}
                    </span>

                    <span>
                      Assigned by {hw.teacher.fullName}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}


