import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  School,
} from "lucide-react";
import HomeworkForm from "./HomeworkForm";
import DeleteHomeworkButton from "./DeleteHomeworkButton";
import EditHomeworkButton from "./EditHomeworkButton";

type TeacherAssignment = {
  id: string;
  sectionId: string;
  subjectId: string;

  section: {
    id: string;
    label: string;

    grade: {
      id: string;
      level: number;
    };

    schoolYear: {
      id: string;
      label: string;
    };
  };

  subject: {
    id: string;
    name: string;
  };
};

export default async function TeacherHomeworkPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return null;
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },

    include: {
      subjectAssignments: {
        include: {
          section: {
            include: {
              grade: true,
              schoolYear: true,
            },
          },

          subject: true,
        },

        orderBy: [
          {
            section: {
              schoolYear: {
                label: "desc",
              },
            },
          },

          {
            section: {
              grade: {
                level: "asc",
              },
            },
          },

          {
            section: {
              label: "asc",
            },
          },
        ],
      },

      homework: {
        include: {
          section: {
            include: {
              grade: true,
              schoolYear: true,
            },
          },

          subject: true,
        },

        orderBy: [
          {
            assignedDate: "desc",
          },

          {
            createdAt: "desc",
          },
        ],
      },
    },
  });

  if (!teacher) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="font-bold text-red-800">
          Teacher Profile Not Found
        </h1>

        <p className="mt-1 text-sm text-red-700">
          Your teacher account is not connected correctly.
        </p>
      </div>
    );
  }

  const assignments: TeacherAssignment[] =
    teacher.subjectAssignments;

  const homework = teacher.homework;

  /*
   * --------------------------------------------------------------------------
   * Build the year â†’ grade â†’ section structure.
   *
   * Only sections that this teacher is actually assigned to appear.
   * --------------------------------------------------------------------------
   */

  const yearMap = new Map<
    string,
    {
      id: string;
      label: string;
      grades: Map<
        string,
        {
          id: string;
          level: number;
          sections: TeacherAssignment[];
        }
      >;
    }
  >();

  for (const assignment of assignments) {
    const year = assignment.section.schoolYear;
    const grade = assignment.section.grade;

    if (!yearMap.has(year.id)) {
      yearMap.set(year.id, {
        id: year.id,
        label: year.label,
        grades: new Map(),
      });
    }

    const yearEntry = yearMap.get(year.id)!;

    if (!yearEntry.grades.has(grade.id)) {
      yearEntry.grades.set(grade.id, {
        id: grade.id,
        level: grade.level,
        sections: [],
      });
    }

    yearEntry.grades
      .get(grade.id)!
      .sections.push(assignment);
  }

  const years = Array.from(yearMap.values());

  const upcomingCount = homework.filter(
    (item) => item.dueDate && item.dueDate >= new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl bg-brand-primary p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/60">
              Teacher
            </p>

            <h1 className="mt-1 text-2xl font-black text-white">
              Homework
            </h1>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <BookOpen size={24} />
          </div>
        </div>
      </section>

      {/* Small statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MiniStat
          icon={ClipboardList}
          label="Homework"
          value={homework.length}
        />

        <MiniStat
          icon={School}
          label="Sections"
          value={assignments.length}
        />

        <MiniStat
          icon={CalendarDays}
          label="Upcoming"
          value={upcomingCount}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {assignments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Class selection */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <School size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Select Class
                  </h2>

                  <p className="text-xs text-gray-500">
                    Choose the year, grade, and section.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <ClassSelector
                years={years}
                assignments={assignments}
              />
            </div>
          </section>

          {/* Existing homework */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <ClipboardList size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Your Homework
                  </h2>

                  <p className="text-xs text-gray-500">
                    Homework you have created.
                  </p>
                </div>
              </div>
            </div>

            {homework.length === 0 ? (
              <div className="p-10 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />

                <p className="mt-3 font-semibold text-gray-900">
                  No homework yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {homework.map((item) => (
                  <HomeworkCard
                    key={item.id}
                    homework={item}
                    assignments={assignments}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CLASS SELECTOR                                                             */
/* -------------------------------------------------------------------------- */

function ClassSelector({
  years,
  assignments,
}: {
  years: {
    id: string;
    label: string;
    grades: Map<
      string,
      {
        id: string;
        level: number;
        sections: TeacherAssignment[];
      }
    >;
  }[];
  assignments: TeacherAssignment[];
}) {
  return (
    <div className="space-y-6">
      {years.map((year) => (
        <div key={year.id}>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays
              size={17}
              className="text-brand-primary"
            />

            <h3 className="font-bold text-gray-900">
              School Year {year.label}
            </h3>
          </div>

          <div className="space-y-4">
            {Array.from(year.grades.values()).map((grade) => (
              <div key={grade.id}>
                <div className="mb-2 flex items-center gap-2">
                  <GraduationCap
                    size={16}
                    className="text-gray-500"
                  />

                  <span className="text-sm font-semibold text-gray-700">
                    Grade {grade.level}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grade.sections.map((assignment) => (
                    <ClassCard
                      key={assignment.id}
                      assignment={assignment}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/*
 * This is intentionally a button/card instead of a giant dropdown.
 *
 * Clicking it takes the teacher into that exact section.
 */

function ClassCard({
  assignment,
}: {
  assignment: TeacherAssignment;
}) {
  return (
   <a
  href={`/dashboard/teacher/homework/${assignment.section.id}`}
      className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-primary/40 hover:bg-gray-50"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-gray-900">
            Section {assignment.section.label}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {assignment.subject.name}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary transition group-hover:bg-brand-primary group-hover:text-white">
          <BookOpen size={17} />
        </div>
      </div>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* HOMEWORK CARD                                                              */
/* -------------------------------------------------------------------------- */

function HomeworkCard({
  homework,
  assignments,
}: {
  homework: {
    id: string;
    title: string;
    instructions: string | null;
    source: string;
    textbookName: string | null;
    pageNumber: string | null;
    exercises: string | null;
    sourceNote: string | null;
    assignedDate: Date;
    dueDate: Date | null;
    sectionId: string;
    semesterId: string | null;
    subjectId: string;

    section: {
      label: string;

      grade: {
        level: number;
      };

      schoolYear: {
        label: string;
      };
    };

    subject: {
      name: string;
    };
  };

  assignments: TeacherAssignment[];
}) {
  const isOverdue =
    homework.dueDate &&
    homework.dueDate < new Date();

  return (
    <div className="p-5 transition hover:bg-gray-50">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-gray-900">
              {homework.title}
            </h3>

            <SourceBadge source={homework.source} />

            {isOverdue ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                Overdue
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                <CheckCircle2 size={12} />
                Active
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">
              Grade {homework.section.grade.level}
              {homework.section.label}
            </span>

            <span>{homework.subject.name}</span>

            <span>
              Year {homework.section.schoolYear.label}
            </span>
          </div>

          {homework.instructions && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {homework.instructions}
            </p>
          )}

          {homework.source === "TEXTBOOK" && (
            <div className="mt-3 rounded-xl bg-gray-50 p-4">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
                {homework.textbookName && (
                  <span>
                    <strong>Book:</strong>{" "}
                    {homework.textbookName}
                  </span>
                )}

                {homework.pageNumber && (
                  <span>
                    <strong>Page:</strong>{" "}
                    {homework.pageNumber}
                  </span>
                )}

                {homework.exercises && (
                  <span>
                    <strong>Exercise:</strong>{" "}
                    {homework.exercises}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
            <span>
              Assigned{" "}
              {homework.assignedDate.toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              )}
            </span>

            {homework.dueDate && (
              <span
                className={
                  isOverdue
                    ? "font-semibold text-red-600"
                    : undefined
                }
              >
                Due{" "}
                {homework.dueDate.toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <EditHomeworkButton
            homework={{
              id: homework.id,
              title: homework.title,
              instructions: homework.instructions,
              source: homework.source as
                | "TEXTBOOK"
                | "CLASSWORK"
                | "OTHER",
              textbookName: homework.textbookName,
              pageNumber: homework.pageNumber,
              exercises: homework.exercises,
              sourceNote: homework.sourceNote,
              assignedDate:
                homework.assignedDate.toISOString(),
              dueDate:
                homework.dueDate?.toISOString() ?? null,
              sectionId: homework.sectionId,
              semesterId: homework.semesterId,
              subjectId: homework.subjectId,
            }}
            assignments={assignments}
          />

          <DeleteHomeworkButton
            homeworkId={homework.id}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function SourceBadge({
  source,
}: {
  source: string;
}) {
  const label =
    source === "TEXTBOOK"
      ? "Textbook"
      : source === "CLASSWORK"
        ? "Classwork"
        : "Other";

  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
      {label}
    </span>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
          <Icon size={18} />
        </div>

        <div>
          <p className="text-xs text-gray-500">
            {label}
          </p>

          <p className="text-lg font-black text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <School className="mx-auto h-10 w-10 text-gray-300" />

      <h2 className="mt-3 font-bold text-gray-900">
        No classes assigned
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        An administrator needs to assign you a class and subject.
      </p>
    </div>
  );
}



