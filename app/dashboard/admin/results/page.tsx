import { prisma } from "@/lib/prisma";
import SectionExamGroup from "./SectionExamGroup";

type SearchParams = Promise<{
  schoolYearId?: string;
  gradeId?: string;
  sectionId?: string;
  examId?: string;
}>;

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const schoolYearId = params.schoolYearId || "";
  const gradeId = params.gradeId || "";
  const sectionId = params.sectionId || "";
  const examId = params.examId || "";

  /*
   * ---------------------------------------------------------
   * FILTER OPTIONS
   * ---------------------------------------------------------
   */

  const [schoolYears, grades] = await Promise.all([
    prisma.schoolYear.findMany({
      orderBy: {
        label: "desc",
      },
      select: {
        id: true,
        label: true,
      },
    }),

    prisma.grade.findMany({
      orderBy: {
        level: "asc",
      },
      select: {
        id: true,
        level: true,
      },
    }),
  ]);

  /*
   * Sections available for the selected school year / grade.
   */

  const filterSections = await prisma.section.findMany({
    where: {
      ...(schoolYearId
        ? {
            schoolYearId,
          }
        : {}),

      ...(gradeId
        ? {
            gradeId,
          }
        : {}),
    },
    orderBy: {
      label: "asc",
    },
    select: {
      id: true,
      label: true,
      gradeId: true,
      schoolYearId: true,
    },
  });

  /*
   * Exams available for the selected school year.
   */

  const exams = await prisma.exam.findMany({
    where: schoolYearId
      ? {
          schoolYearId,
        }
      : {},
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      schoolYearId: true,
    },
  });

  /*
   * ---------------------------------------------------------
   * RESULT SECTIONS
   * ---------------------------------------------------------
   *
   * Admin is READ-ONLY here.
   *
   * Teachers enter/update their assigned subject results.
   * Admin only monitors them.
   */

  const sections = await prisma.section.findMany({
    where: {
      ...(schoolYearId
        ? {
            schoolYearId,
          }
        : {}),

      ...(gradeId
        ? {
            gradeId,
          }
        : {}),

      ...(sectionId
        ? {
            id: sectionId,
          }
        : {}),
    },

    include: {
      grade: true,
      schoolYear: true,

      enrollments: {
        where: {
          status: "ACTIVE",
        },

        include: {
          student: {
            include: {
              resultCards: {
                where: examId
                  ? {
                      examId,
                    }
                  : undefined,

                include: {
                  exam: true,

                  results: {
                    include: {
                      subject: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    orderBy: [
      {
        schoolYear: {
          label: "desc",
        },
      },
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

  /*
   * ---------------------------------------------------------
   * BUILD DISPLAY GROUPS
   * ---------------------------------------------------------
   */

  const groups: {
    sectionId: string;
    sectionLabel: string;
    gradeLevel: number;
    schoolYear: string;
    examId: string;
    examName: string;
    status: "DRAFT" | "PUBLISHED" | "MIXED";
    students: {
      studentId: string;
      name: string;
      results: {
        subject: string;
        marks: string;
        grade: string;
      }[];
    }[];
  }[] = [];

  for (const section of sections) {
    const byExam = new Map<string, (typeof groups)[number]>();

    for (const enrollment of section.enrollments) {
      const student = enrollment.student;

      for (const card of student.resultCards) {
        /*
         * Make absolutely sure the result belongs to
         * this section's school year.
         */
        if (card.exam.schoolYearId !== section.schoolYearId) {
          continue;
        }

        /*
         * Extra exam filter protection.
         */
        if (examId && card.examId !== examId) {
          continue;
        }

        if (!byExam.has(card.examId)) {
          byExam.set(card.examId, {
            sectionId: section.id,
            sectionLabel: section.label,
            gradeLevel: section.grade.level,
            schoolYear: section.schoolYear.label,
            examId: card.examId,
            examName: card.exam.name,
            status: card.status,
            students: [],
          });
        }

        const group = byExam.get(card.examId)!;

        if (group.status !== card.status) {
          group.status = "MIXED";
        }

        group.students.push({
          studentId: student.id,
          name: student.fullName,

          results: card.results.map((result) => ({
            subject: result.subject.name,
            marks: `${result.marksObtained}/${result.maxMarks}`,
            grade: result.grade ?? "",
          })),
        });
      }
    }

    groups.push(...byExam.values());
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Results Monitor
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Monitor student results entered by assigned teachers.
        </p>
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">
            Find Results
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Filter results by school year, grade, section, and exam.
          </p>
        </div>

        <form
          method="GET"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* School Year */}
          <div>
            <label
              htmlFor="schoolYearId"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              School Year
            </label>

            <select
              id="schoolYearId"
              name="schoolYearId"
              defaultValue={schoolYearId}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-primary"
            >
              <option value="">All school years</option>

              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label
              htmlFor="gradeId"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Grade
            </label>

            <select
              id="gradeId"
              name="gradeId"
              defaultValue={gradeId}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-primary"
            >
              <option value="">All grades</option>

              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  Grade {grade.level}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label
              htmlFor="sectionId"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Section
            </label>

            <select
              id="sectionId"
              name="sectionId"
              defaultValue={sectionId}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-primary"
            >
              <option value="">All sections</option>

              {filterSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          {/* Exam */}
          <div>
            <label
              htmlFor="examId"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Exam
            </label>

            <select
              id="examId"
              name="examId"
              defaultValue={examId}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-primary"
            >
              <option value="">All exams</option>

              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              Search Results
            </button>

            <a
              href="/dashboard/admin/results"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </a>
          </div>
        </form>
      </section>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {groups.length} result group
            {groups.length === 1 ? "" : "s"}
          </p>

          <p className="text-xs text-slate-400">
            Read-only monitoring
          </p>
        </div>
      </div>

      {/* Results */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-slate-700">
            No results found.
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Try changing the filters or wait for teachers to enter
            results.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <SectionExamGroup
              key={`${group.sectionId}-${group.examId}`}
              group={group}
            />
          ))}
        </div>
      )}
    </div>
  );
}