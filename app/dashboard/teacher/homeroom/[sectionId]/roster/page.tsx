// app/dashboard/teacher/homeroom/[sectionId]/roster/page.tsx

import { requireTeacher } from "@/lib/auth-guard";
import { teacherIsHomeroomTeacher } from "@/lib/teacher-access";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Fragment } from "react";

import RosterActions from "./RosterActions";
import { buildClassNumberMap } from "@/lib/class-number";

type Props = {
  params: Promise<{ sectionId: string }>;
};

type PromotionStatus =
  | "PROMOTED"
  | "NOT_PROMOTED"
  | "PENDING";

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function formatScore(value: number | null) {
  return value === null ? "-" : value.toFixed(1);
}

/*
 * Print version:
 * Missing marks are intentionally blank.
 */
function printScore(value: number | null) {
  return value === null ? "" : value.toFixed(1);
}

type SubjectResult = {
  subjectId: string;
  subjectName: string;
  semester1: number | null;
  semester2: number | null;
  final: number | null;
};

export default async function RosterPage({ params }: Props) {
  const session = await requireTeacher();
  const { sectionId } = await params;

  // ============================================================
  // TEACHER / SCHOOL SETTINGS
  // ============================================================

  const schoolSettings = await prisma.schoolSettings.findUnique({
    where: {
      id: 1,
    },
  });

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!teacher) {
    notFound();
  }

  // ============================================================
  // SECTION
  // ============================================================

  const section = await prisma.section.findUnique({
    where: {
      id: sectionId,
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
              parentContacts: {
                take: 1,
              },
            },
          },
        },

        orderBy: {
          student: {
            fullName: "asc",
          },
        },
      },

      subjectAssignments: {
        include: {
          subject: true,
          teacher: true,
        },
      },
    },
  });

  if (!section) {
    notFound();
  }

  // Only the assigned homeroom teacher may view this roster.
  if (!(await teacherIsHomeroomTeacher(teacher.id, sectionId))) {
    notFound();
  }

  // ============================================================
  // SEMESTERS
  // ============================================================

  const semesters = await prisma.semester.findMany({
    where: {
      schoolYearId: section.schoolYearId,
    },

    orderBy: {
      number: "asc",
    },
  });

  const semester1 =
    semesters.find((semester) => semester.number === 1) ??
    semesters[0] ??
    null;

  const semester2 =
    semesters.find((semester) => semester.number === 2) ??
    semesters[1] ??
    null;

  
  // The homeroom roster is fully locked only when
  // every semester belonging to this school year is locked.
  const isYearLocked =
    semesters.length > 0 &&
    semesters.every((semester) => semester.isLocked);
// ============================================================
  // STUDENTS
  // ============================================================

  const studentIds = section.enrollments.map(
    (enrollment) => enrollment.studentId
  );

  // ============================================================
  // EXAMS
  // ============================================================

  const semesterIds = [
    semester1?.id,
    semester2?.id,
  ].filter((id): id is string => Boolean(id));

  const exams =
    semesterIds.length > 0
      ? await prisma.exam.findMany({
          where: {
            semesterId: {
              in: semesterIds,
            },
          },

          select: {
            id: true,
            semesterId: true,
          },
        })
      : [];

  const examIds = exams.map((exam) => exam.id);

  // ============================================================
  // SEMESTER SUBJECT RESULTS
  // ============================================================

  const semesterSubjectResults =
    studentIds.length > 0 && semesterIds.length > 0
      ? await prisma.semesterSubjectResult.findMany({
          where: {
            studentId: {
              in: studentIds,
            },

            submission: {
              semesterId: {
                in: semesterIds,
              },

              status: "SUBMITTED",
            },
          },

          select: {
            studentId: true,
            marksObtained: true,
            maxMarks: true,

            submission: {
              select: {
                semesterId: true,
                subjectId: true,
              },
            },
          },
        })
      : [];

  // ============================================================
  // EXAMS BY SEMESTER
  // ============================================================

  const examsBySemester = new Map<string, string[]>();

  for (const exam of exams) {
    const current =
      examsBySemester.get(exam.semesterId) ?? [];

    current.push(exam.id);

    examsBySemester.set(
      exam.semesterId,
      current
    );
  }

  // ============================================================
  // RESULT CARDS
  // ============================================================

  const resultCards =
    studentIds.length > 0 && examIds.length > 0
      ? await prisma.resultCard.findMany({
          where: {
            studentId: {
              in: studentIds,
            },

            examId: {
              in: examIds,
            },

            status: "PUBLISHED",
          },

          select: {
            studentId: true,
            examId: true,
            publishedAt: true,

            results: {
              select: {
                subjectId: true,
                marksObtained: true,
                maxMarks: true,
              },
            },
          },
        })
      : [];

  // ============================================================
  // SUBJECTS
  // ============================================================

  const subjects = Array.from(
    new Map(
      section.subjectAssignments.map(
        (assignment) => [
          assignment.subject.id,
          assignment.subject,
        ]
      )
    ).values()
  ).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // ============================================================
  // GET SUBJECT SCORE
  // ============================================================

  function getSubjectScore(
    studentId: string,
    subjectId: string,
    semesterId: string | null
  ) {
    if (!semesterId) {
      return null;
    }

    // ----------------------------------------------------------
    // New semester-subject submission system
    // ----------------------------------------------------------

    const semesterResult =
      semesterSubjectResults.find(
        (result) =>
          result.studentId === studentId &&
          result.submission.semesterId === semesterId &&
          result.submission.subjectId === subjectId
      );

    if (semesterResult) {
      const maximum = Number(
        semesterResult.maxMarks
      );

      const obtained = Number(
        semesterResult.marksObtained
      );

      if (maximum <= 0) {
        return null;
      }

      return round1(
        (obtained / maximum) * 100
      );
    }

    // ----------------------------------------------------------
    // Older exam/result-card system
    // ----------------------------------------------------------

    const semesterExamIds =
      examsBySemester.get(semesterId) ?? [];

    if (semesterExamIds.length === 0) {
      return null;
    }

    let obtained = 0;
    let maximum = 0;
    let found = false;

    for (const card of resultCards) {
      if (card.studentId !== studentId) {
        continue;
      }

      if (!semesterExamIds.includes(card.examId)) {
        continue;
      }

      for (const result of card.results) {
        if (result.subjectId !== subjectId) {
          continue;
        }

        obtained += Number(
          result.marksObtained
        );

        maximum += Number(
          result.maxMarks
        );

        found = true;
      }
    }

    if (
      !found ||
      maximum <= 0
    ) {
      return null;
    }

    return round1(
      (obtained / maximum) * 100
    );
  }

  // ============================================================
  // BUILD STUDENT ROWS
  // ============================================================

  const rows = section.enrollments.map(
    (enrollment) => {
      const student = enrollment.student;

      const subjectResults: SubjectResult[] =
        subjects.map((subject) => {
          const semester1Score =
            getSubjectScore(
              student.id,
              subject.id,
              semester1?.id ?? null
            );

          const semester2Score =
            getSubjectScore(
              student.id,
              subject.id,
              semester2?.id ?? null
            );

          const final =
            semester1Score !== null &&
            semester2Score !== null
              ? round1(
                  (semester1Score +
                    semester2Score) /
                    2
                )
              : null;

          return {
            subjectId: subject.id,
            subjectName: subject.name,
            semester1: semester1Score,
            semester2: semester2Score,
            final,
          };
        });

      // ========================================================
      // SEMESTER COMPLETENESS
      // ========================================================

      const semester1Complete =
        subjects.length > 0 &&
        subjectResults.every(
          (subject) =>
            subject.semester1 !== null
        );

      const semester2Complete =
        subjects.length > 0 &&
        subjectResults.every(
          (subject) =>
            subject.semester2 !== null
        );

      // ========================================================
      // SEMESTER I AVERAGE
      // ========================================================

      const semester1Average =
        semester1Complete
          ? round1(
              subjectResults.reduce(
                (sum, subject) =>
                  sum +
                  (subject.semester1 ?? 0),
                0
              ) / subjects.length
            )
          : null;

      // ========================================================
      // SEMESTER II AVERAGE
      // ========================================================

      const semester2Average =
        semester2Complete
          ? round1(
              subjectResults.reduce(
                (sum, subject) =>
                  sum +
                  (subject.semester2 ?? 0),
                0
              ) / subjects.length
            )
          : null;

      // ========================================================
      // FINAL
      // ========================================================

      const finalComplete =
        semester1Complete &&
        semester2Complete;

      const finalAverage =
        finalComplete
          ? round1(
              subjectResults.reduce(
                (sum, subject) =>
                  sum +
                  (subject.final ?? 0),
                0
              ) / subjects.length
            )
          : null;

      return {
        student,
        subjects: subjectResults,
        semester1Average,
        semester2Average,
        finalAverage,
      };
    }
  );

  // ============================================================
  // PROMOTION RESULTS
  //
  // Promotion is separate from the school stamp.
  // ============================================================

  function getPromotionStatus(
    row: (typeof rows)[number]
  ): PromotionStatus {
    // The whole year must be complete first.
    if (
      row.finalAverage === null ||
      row.subjects.length === 0
    ) {
      return "PENDING";
    }

    // Every subject must have both semesters.
    const yearComplete = row.subjects.every(
      (subject) =>
        subject.semester1 !== null &&
        subject.semester2 !== null &&
        subject.final !== null
    );

    if (!yearComplete) {
      return "PENDING";
    }

    // Count subjects whose WHOLE-YEAR average is below 50.
    const failedSubjects = row.subjects.filter(
      (subject) =>
        (subject.final ?? 0) < 50
    ).length;

    return failedSubjects >= 3
      ? "NOT_PROMOTED"
      : "PROMOTED";
  }

  function getPromotionLabel(
    status: PromotionStatus
  ) {
    if (status === "PROMOTED") {
      return "PROMOTED";
    }

    if (status === "NOT_PROMOTED") {
      return "NOT PROMOTED";
    }

    return "PENDING";
  }

  const promotionByStudent = new Map<
    string,
    PromotionStatus
  >();

  for (const row of rows) {
    promotionByStudent.set(
      row.student.id,
      getPromotionStatus(row)
    );
  }

  // ============================================================
  // NEXT GRADE
  // ============================================================

  function getNextGradeLabel() {
    const currentLevel = Number(section?.grade?.level ?? 0);

    if (!Number.isNaN(currentLevel)) {
      return `Grade ${currentLevel + 1}`;
    }

    return "Next Grade";
  }

  // ============================================================
  // RANKS
  // ============================================================

  function createRanks(
    getter: (
      row: (typeof rows)[number]
    ) => number | null
  ) {
    const ranked = rows
      .filter(
        (row) =>
          getter(row) !== null
      )
      .sort(
        (a, b) =>
          (getter(b) ?? 0) -
          (getter(a) ?? 0)
      );

    const ranks = new Map<
      string,
      number
    >();

    let lastScore: number | null =
      null;

    let lastRank = 0;

    ranked.forEach(
      (row, index) => {
        const score = getter(row);

        if (score !== lastScore) {
          lastRank = index + 1;
          lastScore = score;
        }

        ranks.set(
          row.student.id,
          lastRank
        );
      }
    );

    return ranks;
  }

  const semester1Ranks =
    createRanks(
      (row) =>
        row.semester1Average
    );

  const semester2Ranks =
    createRanks(
      (row) =>
        row.semester2Average
    );

  const finalRanks =
    createRanks(
      (row) =>
        row.finalAverage
    );

  // ============================================================
  // TOP THREE
  // ============================================================

  const topThree = [...rows]
    .filter(
      (row) =>
        row.finalAverage !== null
    )
    .sort(
      (a, b) =>
        (b.finalAverage ?? 0) -
        (a.finalAverage ?? 0)
    )
    .slice(0, 3);

  // ============================================================
  // SCHOOL
  // ============================================================

  const schoolName =
    "Level UP Academy";

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <>
      <style>{`
        .screen-only {
          display: block;
        }

        .print-only {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            background: white !important;
            color: black !important;
          }

          .screen-only {
            display: none !important;
          }

          .print-only {
            display: block !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /*
           * ONE .report-page = ONE A4 SHEET.
           */

          .report-page {
            display: block !important;

            width: 210mm !important;
            height: 297mm !important;

            min-width: 210mm !important;
            max-width: 210mm !important;

            min-height: 297mm !important;
            max-height: 297mm !important;

            box-sizing: border-box !important;

            margin: 0 !important;
            padding: 15mm 16mm !important;

            background: white !important;
            color: black !important;

            font-family:
              Arial,
              "Nyala",
              "DejaVu Sans",
              sans-serif;

            font-size: 12px;

            overflow: hidden !important;

            page-break-before: always !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;

            break-before: page !important;
            break-after: page !important;
            break-inside: avoid !important;
          }

          .report-page:first-child {
            page-break-before: auto !important;
            break-before: auto !important;
          }

          .report-page + .report-page {
            page-break-before: always !important;
            break-before: page !important;
          }

          .report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /*
           * HEADER
           */

          .report-header {
            border-bottom: 2px solid #0f2a47;
            padding-bottom: 12px;
            margin-bottom: 13px;
          }

          .report-school-row {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .report-school-logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
            flex-shrink: 0;
          }

          .report-school-logo-placeholder {
            width: 60px;
            height: 60px;
            border: 2px solid #0f2a47;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: bold;
            color: #0f2a47;
            flex-shrink: 0;
          }

          .school-name-am {
            font-family:
              "Nyala",
              "DejaVu Sans",
              Arial,
              sans-serif;

            font-size: 20px;
            font-weight: 800;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #0f2a47;
          }

          .school-name-en {
            font-size: 10px;
            font-weight: 600;
            color: #6b7280;
            margin-top: 4px;
          }

          .school-address {
            font-size: 9px;
            color: #6b7280;
            margin-top: 5px;
          }

          .report-title {
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f2a47;
            margin-top: 12px;
          }

          /*
           * STUDENT INFORMATION
           */

          .student-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 7px 18px;
            margin-bottom: 13px;
            font-size: 11px;
          }

          /*
           * RESULTS
           */

          .result-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }

          .result-table th,
          .result-table td {
            border: 1px solid black;
            padding: 5px 6px;
            text-align: center;
            font-size: 11px;
            line-height: 1.25;
          }

          .result-table th {
            background: #f2f2f2 !important;
            font-weight: bold;
          }

          .result-table td.subject {
            text-align: left;
          }

          .result-table .result-total {
            font-weight: bold;
          }

          /*
           * FOOTER
           */

          .report-footer {
            margin-top: 14px;
            font-size: 11px;
          }

          .comment-line {
            border-bottom: 1px solid black;
            display: inline-block;
            width: 68%;
            min-height: 16px;
            vertical-align: bottom;
          }

          .signature-row {
            display: flex;
            justify-content: space-between;
            margin-top: 18px;
          }

          .signature-box {
            width: 46%;
          }

          .signature-line {
            border-bottom: 1px solid black;
            display: inline-block;
            min-width: 125px;
            margin-left: 4px;
          }

          .principal-section {
            margin-top: 18px;
            text-align: center;
          }

          /*
           * SCHOOL STAMP / SCHOOL SEAL
           *
           * IMPORTANT:
           * This is the SCHOOL STAMP.
           * It is NOT replaced by promotion status.
           */

          .stamp-box {
            width: 70px;
            height: 70px;

            border: 3px solid black;
            border-radius: 50%;

            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;

            margin: 8px auto 0;

            font-size: 10px;
            line-height: 1.2;
            text-align: center;
            font-weight: 900;

            transform: rotate(-8deg);

            position: relative;
            box-sizing: border-box;
          }

          .stamp-box::before {
            content: "";
            position: absolute;

            inset: 5px;

            border: 1px solid black;
            border-radius: 50%;
          }

          .stamp-main {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.8px;
            z-index: 1;
          }

          .stamp-sub {
            font-size: 8px;
            margin-top: 3px;
            letter-spacing: 0.5px;
            z-index: 1;
          }

          /*
           * BACK PAGE
           */
.traits-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
  margin-bottom: 12px;
  font-size: 11px;
  width: 100%;
  box-sizing: border-box;
}

.traits-info > div {
  display: block !important;
  min-width: 0;
}

          .traits-note {
            font-size: 10px;
            margin-bottom: 12px;
            padding: 5px 0;
            border-top: 1px solid black;
            border-bottom: 1px solid black;
          }

          .traits-table {
            width: 100%;
            border-collapse: collapse;
          }

          .traits-table th,
          .traits-table td {
            border: 1px solid black;
            padding: 5px 6px;
            font-size: 10.5px;
          }

          .traits-table th {
            text-align: center;
            background: #f2f2f2 !important;
            font-weight: bold;
          }

          .traits-table th.trait-name {
            text-align: left;
          }

          .traits-table td:first-child {
            text-align: left;
          }

          .traits-table td:not(:first-child) {
            text-align: center;
          }

          .trait-category td {
            background: #eeeeee !important;
            font-weight: bold;
            text-align: left !important;
          }
        }
      `}</style>

      {/* ======================================================
          SCREEN
      ======================================================= */}

      <main className="screen-only p-5">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href={`/dashboard/teacher/homeroom/${sectionId}`}
              className="text-lg text-slate-600 hover:text-slate-950"
            >
              â†
            </Link>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Homeroom Â· View Results
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-950">
                {schoolName} Student Results
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Grade {section.grade.level}
                {section.label} Â·{" "}
                {section.schoolYear.label}
              </p>
            </div>
          </div>

          <RosterActions isYearLocked={isYearLocked} />
        </div>

        {/* ====================================================
            COMPLETE STUDENT RESULTS
        ===================================================== */}

        <section className="border border-slate-300 bg-white">
          <div className="border-b border-slate-300 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">
              All Students Semester Report
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Results by subject for Semester I,
              Semester II, and the subject average.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="bg-[#343a40] text-white">
                  <th
                    rowSpan={2}
                    className="border border-slate-500 px-4 py-3 text-left"
                  >
                    Student Name
                  </th>

                  {subjects.map((subject) => (
                    <th
                      key={subject.id}
                      colSpan={3}
                      className="border border-slate-500 px-4 py-3 text-center"
                    >
                      {subject.name}
                    </th>
                  ))}

                  <th
                    colSpan={4}
                    className="border border-slate-500 px-4 py-3 text-center"
                  >
                    Overall
                  </th>
                </tr>

                <tr className="bg-slate-100 text-slate-700">
                  {subjects.map((subject) => (
                    <Fragment
                      key={`${subject.id}-headers`}
                    >
                      <th className="border border-slate-300 px-3 py-2">
                        Sem I
                      </th>

                      <th className="border border-slate-300 px-3 py-2">
                        Sem II
                      </th>

                      <th className="border border-slate-300 px-3 py-2">
                        Avg
                      </th>
                    </Fragment>
                  ))}

                  <th className="border border-slate-300 px-3 py-2">
                    Sem I
                  </th>

                  <th className="border border-slate-300 px-3 py-2">
                    Sem II
                  </th>

                  <th className="border border-slate-300 px-3 py-2">
                    Final
                  </th>

                  <th className="border border-slate-300 px-3 py-2">
                    Rank
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.student.id}
                    className="border-b border-slate-200 hover:bg-slate-50"
                  >
                    <td className="border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                      <div className="font-bold text-slate-900">
                        {row.student.fullName}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {row.student.studentLoginId}
                      </div>
                    </td>

                    {row.subjects.map((subject) => (
                      <Fragment
                        key={`${row.student.id}-${subject.subjectId}`}
                      >
                        <td className="border border-slate-200 px-3 py-3 text-center">
                          {formatScore(
                            subject.semester1
                          )}
                        </td>

                        <td className="border border-slate-200 px-3 py-3 text-center">
                          {formatScore(
                            subject.semester2
                          )}
                        </td>

                        <td className="border border-slate-200 px-3 py-3 text-center font-semibold">
                          {formatScore(
                            subject.final
                          )}
                        </td>
                      </Fragment>
                    ))}

                    <td className="border border-slate-200 px-3 py-3 text-center font-semibold">
                      {formatScore(
                        row.semester1Average
                      )}
                    </td>

                    <td className="border border-slate-200 px-3 py-3 text-center font-semibold">
                      {formatScore(
                        row.semester2Average
                      )}
                    </td>

                    <td className="border border-slate-200 px-3 py-3 text-center font-bold">
                      {formatScore(
                        row.finalAverage
                      )}
                    </td>

                    <td className="border border-slate-200 px-3 py-3 text-center font-bold">
                      {finalRanks.get(
                        row.student.id
                      ) ?? "-"}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        subjects.length * 3 + 5
                      }
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      No students found in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ====================================================
            CERTIFICATES
        ===================================================== */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">
              Achievement Certificates
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the students who should receive
              academic recognition.
            </p>
          </div>

                    <div className="mb-4 flex gap-3">
            {isYearLocked ? (
              <>
                <span
                  title="This school year is locked."
                  className="cursor-not-allowed border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400"
                >
                  Top 3
                </span>

                <span
                  title="This school year is locked."
                  className="cursor-not-allowed border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400"
                >
                  Top 5
                </span>
              </>
            ) : (
              <>
                <Link
                  href={`/dashboard/teacher/homeroom/${sectionId}/certificate?top=3`}
                  className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Top 3
                </Link>

                <Link
                  href={`/dashboard/teacher/homeroom/${sectionId}/certificate?top=5`}
                  className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Top 5
                </Link>
              </>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-300 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-700">
                  <th className="border border-slate-300 px-4 py-3">
                    Student
                  </th>

                  <th className="border border-slate-300 px-4 py-3">
                    Final Average
                  </th>

                  <th className="border border-slate-300 px-4 py-3">
                    Rank
                  </th>

                  <th className="border border-slate-300 px-4 py-3 text-right">
                    Certificate
                  </th>
                </tr>
              </thead>

              <tbody>
                {topThree.map((row) => {
                  const rank =
                    finalRanks.get(
                      row.student.id
                    ) ?? 0;

                  return (
                    <tr
                      key={row.student.id}
                      className="border-b border-slate-200"
                    >
                      <td className="border border-slate-200 px-4 py-3">
                        <div className="font-bold text-slate-950">
                          {row.student.fullName}
                        </div>

                        <div className="text-xs text-slate-500">
                          {row.student.studentLoginId}
                        </div>
                      </td>

                      <td className="border border-slate-200 px-4 py-3 font-bold">
                        {formatScore(
                          row.finalAverage
                        )}
                      </td>

                      <td className="border border-slate-200 px-4 py-3 font-bold">
                        {rank}
                      </td>

                      <td className="border border-slate-200 px-4 py-3 text-right">
                        {isYearLocked ? (
                          <span
                            title="This school year is locked."
                            className="cursor-not-allowed text-sm font-semibold text-slate-400"
                          >
                            View Certificate
                          </span>
                        ) : (
                          <Link
                            href={`/dashboard/teacher/homeroom/${sectionId}/certificate?studentId=${row.student.id}`}
                            className="text-sm font-semibold text-[#0f2a47] hover:underline"
                          >
                            View Certificate
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {topThree.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      Certificates will appear when
                      students have final results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ======================================================
          PRINT REPORT CARDS

          IMPORTANT PRINT STRUCTURE:

          STUDENT 1
            PAGE 1 = REPORT CARD
            PAGE 2 = PERSONAL DATA + TRAITS

          STUDENT 2
            PAGE 3 = REPORT CARD
            PAGE 4 = PERSONAL DATA + TRAITS

          STUDENT 3
            PAGE 5 = REPORT CARD
            PAGE 6 = PERSONAL DATA + TRAITS
      ======================================================= */}

      <div className="print-only">
        {rows.map((row) => {
          const semester1Rank =
            semester1Ranks.get(
              row.student.id
            );

          const semester2Rank =
            semester2Ranks.get(
              row.student.id
            );

          const finalRank =
            finalRanks.get(
              row.student.id
            );

          const promotionStatus =
            promotionByStudent.get(
              row.student.id
            ) ?? "PENDING";

          const promotionLabel =
            getPromotionLabel(
              promotionStatus
            );

          const nextGrade =
            getNextGradeLabel();

          const semester1Complete =
            row.semester1Average !== null;

          const semester2Complete =
            row.semester2Average !== null;

          const hasFinal =
            semester1Complete &&
            semester2Complete &&
            row.finalAverage !== null;

          const semester1Total =
            semester1Complete
              ? row.subjects.reduce(
                  (sum, subject) =>
                    sum +
                    (subject.semester1 ?? 0),
                  0
                )
              : null;

          const semester2Total =
            semester2Complete
              ? row.subjects.reduce(
                  (sum, subject) =>
                    sum +
                    (subject.semester2 ?? 0),
                  0
                )
              : null;

          const finalTotal =
            hasFinal
              ? row.subjects.reduce(
                  (sum, subject) =>
                    sum +
                    (subject.final ?? 0),
                  0
                )
              : null;

          const conductSemester1 = "";
          const conductSemester2 = "";

          return (
            /*
             * ==================================================
             * ONE STUDENT PRINT SET
             * ==================================================
             */

            <div
              key={row.student.id}
              className="student-print-set"
            >

              {/* ==================================================
                  PAGE 1
                  COMPLETE REPORT CARD
              =================================================== */}

              <div className="report-page">

                {/* HEADER */}
                <div className="report-header">
  <div className="report-school-row">
    {schoolSettings?.logoUrl ? (
      <img
        src={schoolSettings.logoUrl}
        alt={schoolSettings.schoolName || "School logo"}
        className="report-school-logo"
      />
    ) : (
      <div className="report-school-logo-placeholder">
        LOGO
      </div>
    )}

    <div>
      <div className="school-name-am">
        {schoolSettings?.schoolName || schoolName}
      </div>

      <div className="school-name-en">
        {schoolSettings?.schoolNameEnglish || "LEVEL UP INTERNATIONAL P.L.C. A.D.M No. 1"}
      </div>

      <div className="school-address">
        Phone: {schoolSettings?.phone || ""} | Fax: {schoolSettings?.fax || ""} | {schoolSettings?.address || "Bahir Dar"}
      </div>
    </div>
  </div>

  <div className="report-title">
    የተማሪዎች ውጤት መግለጫ / STUDENT'S REPORT CARD
  </div>
</div>{/* STUDENT INFO */}

                <div className="student-info">
                  <div>
                    <b>Student Name:</b>{" "}
                    {row.student.fullName}
                  </div>

                  <div>
                    <b>Student ID:</b>{" "}
                    {row.student.studentLoginId}
                  </div>

                  <div>
                    <b>Year:</b>{" "}
                    {section.schoolYear.label} E.C.
                  </div>

                  <div>
                    <b>Class:</b>{" "}
                    {section.grade.level}
                    {section.label}
                  </div>
                </div>

                {/* RESULT TABLE */}

                <table className="result-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>SUBJECT</th>
                      <th>SEMESTER I</th>
                      <th>SEMESTER II</th>
                      <th>AVERAGE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {row.subjects.map(
                      (subject, index) => {
                        const subjectAverage =
                          subject.semester1 !== null &&
                          subject.semester2 !== null
                            ? subject.final
                            : null;

                        return (
                          <tr
                            key={`${row.student.id}-${subject.subjectId}`}
                          >
                            <td>
                              {index + 1}
                            </td>

                            <td className="subject">
                              {subject.subjectName}
                            </td>

                            <td>
                              {printScore(
                                subject.semester1
                              )}
                            </td>

                            <td>
                              {printScore(
                                subject.semester2
                              )}
                            </td>

                            <td>
                              {printScore(
                                subjectAverage
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}

                    <tr className="result-total">
                      <td colSpan={2}>
                        TOTAL
                      </td>

                      <td>
                        {semester1Total !== null
                          ? semester1Total.toFixed(1)
                          : ""}
                      </td>

                      <td>
                        {semester2Total !== null
                          ? semester2Total.toFixed(1)
                          : ""}
                      </td>

                      <td>
                        {finalTotal !== null
                          ? finalTotal.toFixed(1)
                          : ""}
                      </td>
                    </tr>

                    <tr className="result-total">
                      <td colSpan={2}>
                        AVERAGE
                      </td>

                      <td>
                        {printScore(
                          row.semester1Average
                        )}
                      </td>

                      <td>
                        {printScore(
                          row.semester2Average
                        )}
                      </td>

                      <td>
                        {hasFinal
                          ? printScore(
                              row.finalAverage
                            )
                          : ""}
                      </td>
                    </tr>

                    <tr className="result-total">
                      <td colSpan={2}>
                        RANK
                      </td>

                      <td>
                        {semester1Rank ?? ""}
                      </td>

                      <td>
                        {semester2Rank ?? ""}
                      </td>

                      <td>
                        {finalRank ?? ""}
                      </td>
                    </tr>

                    <tr className="result-total">
                      <td colSpan={2}>
                        CONDUCT
                      </td>

                      <td>
                        {conductSemester1}
                      </td>

                      <td>
                        {conductSemester2}
                      </td>

                      <td></td>
                    </tr>
                  </tbody>
                </table>

                {/* COMMENTS + SIGNATURES */}

                <div className="report-footer">

                  <p>
                    <b>
                      1st Semester Comment:
                    </b>{" "}
                    <span className="comment-line"></span>
                  </p>

                  <div className="signature-row">
                    <div className="signature-box">
                      <div>
                        Teacher:{" "}
                        <strong>
                          {teacher.fullName}
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                        }}
                      >
                        Signature:

                        {teacher.signatureUrl ? (
                          <img
                            src={
                              teacher.signatureUrl
                            }
                            alt="Teacher signature"
                            style={{
                              display:
                                "inline-block",
                              height: 42,
                              maxWidth: 150,
                              objectFit:
                                "contain",
                              verticalAlign:
                                "middle",
                              marginLeft: 8,
                            }}
                          />
                        ) : (
                          <span className="signature-line"></span>
                        )}
                      </div>
                    </div>

                    <div className="signature-box">
                      <div>
                        Guardian:
                        <span className="signature-line"></span>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                        }}
                      >
                        Signature:
                        <span className="signature-line"></span>
                      </div>
                    </div>
                  </div>

                  <p
                    style={{
                      marginTop: 20,
                    }}
                  >
                    <b>
                      2nd Semester Comment:
                    </b>{" "}
                    <span className="comment-line"></span>
                  </p>

                  <div className="signature-row">
                    <div className="signature-box">
                      <div>
                        Teacher:{" "}
                        <strong>
                          {teacher.fullName}
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                        }}
                      >
                        Signature:

                        {teacher.signatureUrl ? (
                          <img
                            src={
                              teacher.signatureUrl
                            }
                            alt="Teacher signature"
                            style={{
                              display:
                                "inline-block",
                              height: 42,
                              maxWidth: 150,
                              objectFit:
                                "contain",
                              verticalAlign:
                                "middle",
                              marginLeft: 8,
                            }}
                          />
                        ) : (
                          <span className="signature-line"></span>
                        )}
                      </div>
                    </div>

                    <div className="signature-box">
                      <div>
                        Guardian:
                        <span className="signature-line"></span>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                        }}
                      >
                        Signature:
                        <span className="signature-line"></span>
                      </div>
                    </div>
                  </div>

                  <div className="principal-section">
                    <div>
                      Principal Name &amp; Signature:{" "}
                      <strong>
                        {
                          schoolSettings?.directorName ??
                          "Principal"
                        }
                      </strong>

                      {schoolSettings?.directorSignatureUrl ? (
                        <img
                          src={
                            schoolSettings.directorSignatureUrl
                          }
                          alt="Principal signature"
                          style={{
                            display: "block",
                            height: 48,
                            maxWidth: 170,
                            objectFit: "contain",
                            marginTop: 4,
                            marginLeft: "auto",
                            marginRight: "auto",
                          }}
                        />
                      ) : (
                        <span className="signature-line"></span>
                      )}
                    </div>

                    {/* ==================================================
                        SCHOOL STAMP / SCHOOL SEAL

                        IMPORTANT:
                        DO NOT put PROMOTED here.

                        The school stamp remains the school stamp.
                        Promotion is displayed separately on PAGE 2.
                    =================================================== */}

                    <div className="stamp-box">
  {schoolSettings?.stampUrl ? (
    <img
      src={schoolSettings.stampUrl}
      alt="School stamp"
      className="relative z-10 h-[70px] w-[70px] object-contain"
    />
  ) : (
    <>
      <div className="stamp-main">
        LEVEL UP
      </div>
      <div className="stamp-sub">
        ACADEMY
      </div>
      <div className="stamp-sub">
        SCHOOL SEAL
      </div>
    </>
  )}
</div>
                  </div>

                </div>
              </div>

              {/* ==================================================
                  PAGE 2
                  PERSONAL DATA + TRAITS
              =================================================== */}

              <div className="report-page">

                {/* HEADER */}

  <div className="report-header">
  <div className="report-school-row">
    {schoolSettings?.logoUrl ? (
      <img
        src={schoolSettings.logoUrl}
        alt={schoolSettings.schoolName || "School logo"}
        className="report-school-logo"
      />
    ) : (
      <div className="report-school-logo-placeholder">
        LOGO
      </div>
    )}

    <div>
      <div className="school-name-am">
        {schoolSettings?.schoolName || schoolName}
      </div>

      <div className="school-name-en">
        {schoolSettings?.schoolNameEnglish || "LEVEL UP INTERNATIONAL P.L.C. A.D.M No. 1"}
      </div>

      <div className="school-address">
        Phone: {schoolSettings?.phone || ""} | Fax: {schoolSettings?.fax || ""} | {schoolSettings?.address || "Bahir Dar"}
      </div>
    </div>
  </div>

  <div className="report-title">
    STUDENT PERSONAL DATA &amp; TRAITS / የተማሪ መረጃ
  </div>
</div>

                <div className="traits-info">
                  <div>
                    <b>Student Name:</b>{" "}
                    {row.student.fullName}
                  </div>

                  <div>
                    <b>Student ID:</b>{" "}
                    {row.student.studentLoginId}
                  </div>

                  <div>
                    <b>Year:</b>{" "}
                    {section.schoolYear.label} E.C.
                  </div>

                  <div>
                    <b>Class (Grade):</b>{" "}
                    {section.grade.level}
                    {section.label}
                  </div>

                  <div>
                    <b>Address:</b>{" "}
                    Bahir Dar
                  </div>

                  {/* ==================================================
                      PROMOTION IS SEPARATE FROM SCHOOL STAMP
                  =================================================== */}

                  <div>
                    <b>Promotion Status:</b>{" "}
                    {promotionLabel}
                  </div>

                  <div>
                    <b>Promoted to:</b>{" "}
                    {promotionStatus === "PROMOTED"
                      ? nextGrade
                      : promotionStatus === "NOT_PROMOTED"
                      ? "Not Promoted"
                      : "Pending"}
                  </div>
                </div>

                {/* NOTE */}

                <div className="traits-note">
                  <i>
                    Note: E-Excellent, G-Good,
                    S-Satisfactory, N-Needs Improvement
                  </i>
                </div>

                {/* TRAITS TABLE */}

                <table className="traits-table">
                  <thead>
                    <tr>
                      <th className="trait-name">
                        DESIRABLE TRAITS AND HABITS
                      </th>

                      <th>
                        1st Qtr
                      </th>

                      <th>
                        2nd Qtr
                      </th>

                      <th>
                        3rd Qtr
                      </th>

                      <th>
                        4th Qtr
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    <tr className="trait-category">
                      <td colSpan={5}>
                        Personal Development
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Neatness
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Nutrition
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Ability to establish own goals
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Success in reaching objectives
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Flexibility &amp; Creativity
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Self-confidence &amp; Self control
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr className="trait-category">
                      <td colSpan={5}>
                        Social Development
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Gets along with others
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Shows respect for others
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Promote school spirit
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr className="trait-category">
                      <td colSpan={5}>
                        Work Habits
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Curiosity
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Follows direction
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Takes care of material
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Works well independently
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <td>
                        Completes given work
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                  </tbody>
                </table>

              </div>

            </div>
          );
        })}
      </div>
    </>
  );
}







