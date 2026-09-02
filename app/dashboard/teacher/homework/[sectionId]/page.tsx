import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Plus,
} from "lucide-react";
import HomeworkForm from "../HomeworkForm";
import EditHomeworkButton from "../EditHomeworkButton";
import DeleteHomeworkButton from "../DeleteHomeworkButton";

type Props = {
  params: Promise<{
    sectionId: string;
  }>;
  searchParams: Promise<{
    schoolYearId?: string;
    semesterId?: string;
  }>;
};

export default async function TeacherHomeworkSectionPage({
  params,
  searchParams,
}: Props) {
  const { sectionId } = await params;
  const {
    schoolYearId,
    semesterId,
  } = await searchParams;

  const session = await auth();

  if (
    !session?.user?.id ||
    session.user.role !== "TEACHER"
  ) {
    return null;
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!teacher) {
    return null;
  }

  /*
   * Load the section directly.
   *
   * The section page must be able to display homework created
   * for this section without requiring a matching query-string
   * semester or relying on the first teacher assignment.
   */
  const section = await prisma.section.findUnique({
    where: {
      id: sectionId,
    },
    include: {
      grade: true,
      schoolYear: true,
    },
  });

  if (!section) {
    notFound();
  }

  /*
   * A teacher may access this section when they:
   * - teach a subject in the section, OR
   * - are the homeroom teacher.
   */
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId: teacher.id,
      sectionId,
    },
    include: {
      section: {
        include: {
          grade: true,
          schoolYear: true,
        },
      },
      subject: true,
    },
    orderBy: {
      subject: {
        name: "asc",
      },
    },
  });

  const isHomeroomTeacher =
    section.homeroomTeacherId === teacher.id;

  if (assignments.length === 0 && !isHomeroomTeacher) {
    notFound();
  }

  /*
   * URL school year, when supplied, must match the section.
   */
  if (
    schoolYearId &&
    schoolYearId !== section.schoolYearId
  ) {
    notFound();
  }

  /*
   * Load semesters belonging to this section's school year.
   * A missing semester must not prevent the section homework
   * page from displaying existing homework.
   */
  const semesters = await prisma.semester.findMany({
    where: {
      schoolYearId: section.schoolYearId,
    },
    select: {
      id: true,
      name: true,
      number: true,
      startDate: true,
      endDate: true,
      isLocked: true,
    },
    orderBy: {
      number: "asc",
    },
  });

  /*
   * Prefer the requested semester, then the current semester,
   * then the first configured semester.
   */
  const selectedSemester =
    semesters.find(
      (semester) => semester.id === semesterId?.trim()
    ) ??
    
    semesters[0] ??
    null;

  /*
   * IMPORTANT:
   * Load homework created by this teacher for this section.
   *
   * If a semester is selected, use it as a filter.
   * If no semester exists, still show the homework instead of
   * failing the whole page.
   */
  const homework = await prisma.homework.findMany({
    where: {
      teacherId: teacher.id,
      sectionId,
      ...(selectedSemester
        ? {
            semesterId: selectedSemester.id,
          }
        : {}),
    },
    include: {
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
  });
  /*
   * Data required by HomeworkForm.
   */
  const formAssignments =
    assignments.map(
      (assignment) => ({
        id: assignment.id,
        sectionId:
          assignment.sectionId,
        subjectId:
          assignment.subjectId,

        section: {
          id: assignment.section.id,
          label:
            assignment.section.label,

          grade: {
            level:
              assignment.section
                .grade.level,
          },

          schoolYear: {
            label:
              assignment.section
                .schoolYear.label,
          },
        },

        subject: {
          id:
            assignment.subject.id,
          name:
            assignment.subject.name,
        },
      })
    );

  const formSemesters =
    semesters.map(
      (semester) => ({
        id: semester.id,
        name: semester.name,
        number: semester.number,
        startDate:
          semester.startDate.toISOString(),
        endDate:
          semester.endDate.toISOString(),
      })
    );

  return (
    <div className="space-y-8">

      {/* Back */}

      <Link
        href="/dashboard/teacher/homework"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-primary"
      >
        <ArrowLeft size={16} />
        Back to Homework
      </Link>

      {/* Header */}

      <section className="border-b border-gray-200 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {section.schoolYear.label}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Grade {section.grade.level}
              {section.label}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage homework for this section.
            </p>
          </div>

          <BookOpen
            size={26}
            className="shrink-0 text-brand-primary"
          />
        </div>
      </section>

      {/* Current semester */}

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-center gap-3">
          <ClipboardList
            size={21}
            className="text-blue-700"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Current Homework Semester
            </p>

            <p className="mt-0.5 text-base font-bold text-blue-900">
              {selectedSemester?.name ?? "No semester configured"}
            </p>
          </div>
        </div>
      </section>

      {/* Subjects */}

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            Your Subjects
          </h2>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {assignments.map(
            (assignment) => (
              <span
                key={assignment.id}
                className="font-medium text-gray-700"
              >
                {assignment.subject.name}
              </span>
            )
          )}
        </div>
      </section>

      {/* Create homework */}

      <section className="border-t border-gray-200 pt-6">
        <div className="mb-5 flex items-center gap-3">
          <Plus
            size={20}
            className="text-brand-primary"
          />

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Create Homework
            </h2>

            <p className="text-sm text-gray-500">
              Choose the semester and enter dates
              using the Ethiopian Calendar.
            </p>
          </div>
        </div>

        <HomeworkForm
          assignments={
            formAssignments
          }
          semesters={
            formSemesters
          }
          selectedSemesterId={
            selectedSemester?.id ?? ""
          }
          isLocked={selectedSemester?.isLocked ?? false}
        />
      </section>

      {/* Existing homework */}

      <section className="border-t border-gray-200 pt-6">
        <div className="mb-5 flex items-center gap-3">
          <ClipboardList
            size={20}
            className="text-brand-primary"
          />

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Homework for This Section
            </h2>

            <p className="text-sm text-gray-500">
              {homework.length} homework{" "}
              {homework.length === 1
                ? "item"
                : "items"}{" "}
              {selectedSemester ? `in ${selectedSemester.name}` : ""}
            </p>
          </div>
        </div>

        {homework.length === 0 ? (
          <p className="py-8 text-sm text-gray-500">
            No homework has been created
            for this semester yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {homework.map(
              (item) => (
                <div
                  key={item.id}
                  className="py-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    {/* Homework information */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.title}
                        </h3>

                        <span className="text-sm text-gray-500">
                          {item.subject.name}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-gray-400">
                        Assigned{" "}
                        {formatEthiopianDisplay(
                          item.assignedDate
                        )}
                      </p>

                      {item.instructions && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                          {
                            item.instructions
                          }
                        </p>
                      )}

                      {item.source ===
                        "TEXTBOOK" &&
                        (
                          item.textbookName ||
                          item.pageNumber ||
                          item.exercises
                        ) && (
                          <div className="mt-3 text-sm text-gray-600">

                            {item.textbookName && (
                              <span>
                                <strong>
                                  Book:
                                </strong>{" "}
                                {
                                  item.textbookName
                                }
                              </span>
                            )}

                            {item.pageNumber && (
                              <span className="ml-4">
                                <strong>
                                  Page:
                                </strong>{" "}
                                {
                                  item.pageNumber
                                }
                              </span>
                            )}

                            {item.exercises && (
                              <span className="ml-4">
                                <strong>
                                  Exercise:
                                </strong>{" "}
                                {
                                  item.exercises
                                }
                              </span>
                            )}

                          </div>
                        )}

                      {item.dueDate && (
                        <p className="mt-2 text-xs text-gray-500">
                          Due{" "}
                          {formatEthiopianDisplay(
                            item.dueDate
                          )}
                        </p>
                      )}
                    </div>

                    {/* Actions */}

                    <div className="flex shrink-0 items-center gap-2">

                      <EditHomeworkButton
                        homework={{
                          id: item.id,
                          title: item.title,
                          instructions:
                            item.instructions,
                          source:
                            item.source,
                          textbookName:
                            item.textbookName,
                          pageNumber:
                            item.pageNumber,
                          exercises:
                            item.exercises,
                          sourceNote:
                            item.sourceNote,
                          assignedDate:
                            item.assignedDate.toISOString(),
                          dueDate:
                            item.dueDate?.toISOString() ??
                            null,
                          sectionId:
                            item.sectionId,
                          subjectId:
                            item.subjectId,
                          semesterId:
                            item.semesterId ??
                            "",
                        }}
                        assignments={
                          formAssignments
                        }
                        isLocked={selectedSemester?.isLocked ?? false}
                      />

                      <DeleteHomeworkButton
                        homeworkId={
                          item.id
                        }
                        isLocked={selectedSemester?.isLocked ?? false}
                      />

                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}









