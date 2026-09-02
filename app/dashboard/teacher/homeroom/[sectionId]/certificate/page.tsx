import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

import CertificatePrintButton from "./CertificatePrintButton";

type Props = {
  params: Promise<{
    sectionId: string;
  }>;

  searchParams: Promise<{
    top?: string;
    studentId?: string;
  }>;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function getRankText(rank: number) {
  switch (rank) {
    case 1:
      return "First";

    case 2:
      return "Second";

    case 3:
      return "Third";

    case 4:
      return "Fourth";

    case 5:
      return "Fifth";

    case 6:
      return "Sixth";

    case 7:
      return "Seventh";

    case 8:
      return "Eighth";

    case 9:
      return "Ninth";

    case 10:
      return "Tenth";

    default:
  return `${rank}th`;
  }
}

function getRankAmharic(rank: number) {
  return `${rank}th`;
}

export default async function CertificatePage({
  params,
  searchParams,
}: Props) {
  const session = await requireTeacher();

  const { sectionId } = await params;
  const query = await searchParams;

  const schoolSettings = await prisma.schoolSettings.findUnique({
    where: { id: 1 },
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
          student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } },
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
        },
      },
    },
  });

  if (!section) {
    notFound();
  }

  // ============================================================
  // HOMEROOM AUTHORIZATION
  // ============================================================

  if (section.homeroomTeacherId !== teacher.id) {
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
    semesters.find(
      (semester) =>
        semester.number === 1
    ) ??
    semesters[0] ??
    null;

  const semester2 =
    semesters.find(
      (semester) =>
        semester.number === 2
    ) ??
    semesters[1] ??
    null;

  // ============================================================
  // STUDENTS
  // ============================================================

  const studentIds =
    section.enrollments.map(
      (enrollment) =>
        enrollment.studentId
    );

  // ============================================================
  // EXAMS
  // ============================================================

  const semesterIds = [
    semester1?.id,
    semester2?.id,
  ].filter(
    (id): id is string =>
      Boolean(id)
  );

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

  const examIds = exams.map(
    (exam) => exam.id
  );

  // ============================================================
  // EXAMS BY SEMESTER
  // ============================================================

  const examsBySemester =
    new Map<string, string[]>();

  for (const exam of exams) {
    const existing =
      examsBySemester.get(
        exam.semesterId
      ) ?? [];

    existing.push(exam.id);

    examsBySemester.set(
      exam.semesterId,
      existing
    );
  }

  // ============================================================
  // RESULT CARDS
  // ============================================================

  const resultCards =
    studentIds.length > 0 &&
    examIds.length > 0
      ? await prisma.resultCard.findMany({
          where: {
            studentId: {
              in: studentIds,
            },

            examId: {
              in: examIds,
            },
          },

          select: {
            studentId: true,
            examId: true,

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
  );

  // ============================================================
  // SUBJECT SCORE
  // ============================================================

  function getSubjectScore(
    studentId: string,
    subjectId: string,
    semesterId: string | null
  ) {
    if (!semesterId) {
      return null;
    }

    const semesterExamIds =
      examsBySemester.get(
        semesterId
      ) ?? [];

    if (
      semesterExamIds.length === 0
    ) {
      return null;
    }

    let obtained = 0;
    let maximum = 0;

    for (const card of resultCards) {
      if (
        card.studentId !==
        studentId
      ) {
        continue;
      }

      if (
        !semesterExamIds.includes(
          card.examId
        )
      ) {
        continue;
      }

      for (const result of card.results) {
        if (
          result.subjectId !==
          subjectId
        ) {
          continue;
        }

        obtained += Number(
          result.marksObtained
        );

        maximum += Number(
          result.maxMarks
        );
      }
    }

    if (maximum <= 0) {
      return null;
    }

    return round1(
      (obtained / maximum) * 100
    );
  }

  // ============================================================
  // BUILD RANKING
  // ============================================================

  const ranking = section.enrollments
    .map((enrollment) => {
      const student =
        enrollment.student;

      const scores = subjects.map(
        (subject) => {
          const s1 =
            getSubjectScore(
              student.id,
              subject.id,
              semester1?.id ??
                null
            );

          const s2 =
            getSubjectScore(
              student.id,
              subject.id,
              semester2?.id ??
                null
            );

          const values = [
            s1,
            s2,
          ].filter(
            (value): value is number =>
              value !== null
          );

          const final =
            values.length > 0
              ? round1(
                  values.reduce(
                    (
                      sum,
                      value
                    ) =>
                      sum + value,
                    0
                  ) /
                    values.length
                )
              : null;

          return final;
        }
      );

      const finalValues =
        scores.filter(
          (
            value
          ): value is number =>
            value !== null
        );

      const finalAverage =
        finalValues.length > 0
          ? round1(
              finalValues.reduce(
                (
                  sum,
                  value
                ) =>
                  sum + value,
                0
              ) /
                finalValues.length
            )
          : null;

      return {
        student,
        finalAverage,
      };
    })
    .filter(
      (row) =>
        row.finalAverage !==
        null
    )
    .sort(
      (a, b) =>
        (b.finalAverage ?? 0) -
        (a.finalAverage ?? 0)
    );

  // ============================================================
  // ASSIGN RANKS
  // ============================================================

  const rankedStudents =
    ranking.map(
      (row, index) => ({
        ...row,
        rank: index + 1,
      })
    );

  // ============================================================
  // SELECT CERTIFICATE STUDENTS
  // ============================================================

  let selectedStudents =
    rankedStudents;

  const requestedStudentId =
    query.studentId;

  if (requestedStudentId) {
    selectedStudents =
      rankedStudents.filter(
        (row) =>
          row.student.id ===
          requestedStudentId
      );
  } else {
    const requestedTop =
      Number(query.top ?? "3");

    const top =
      [3, 5, 10].includes(
        requestedTop
      )
        ? requestedTop
        : 3;

    selectedStudents =
      rankedStudents.slice(
        0,
        top
      );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <>
      <style>{`

        /* ======================================================
           SCREEN
        ====================================================== */

        .certificate-print-root {
          display: none;
        }

        /* ======================================================
           PRINT
        ====================================================== */

        @media print {

          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /*
           * Hide EVERYTHING from the dashboard layout.
           */

          body * {
            visibility: hidden !important;
          }

          /*
           * Only certificate becomes visible.
           */

          .certificate-print-root,
          .certificate-print-root * {
            visibility: visible !important;
          }

          .certificate-print-root {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .certificate-screen {
            display: none !important;
          }

          .certificate-page {
            width: 297mm;
            height: 210mm;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;

            margin: 0;
            padding: 35px 45px;

            background: white;
            color: black;

            border: 4px solid #000;

            page-break-after: always;
            break-after: page;

            font-family:
              "Nyala",
              "DejaVu Sans",
              Arial,
              sans-serif;
          }

          .certificate-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }

        /* ======================================================
           CERTIFICATE
        ====================================================== */

        .certificate-page {
          font-family:
            "Nyala",
            "DejaVu Sans",
            Arial,
            sans-serif;
        }

        .certificate-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }

        .school-name-am {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }

        .school-name-en {
          font-size: 16px;
          font-weight: bold;
          margin: 5px 0;
          letter-spacing: 1px;
        }

        .certificate-title-am {
          font-size: 22px;
          font-weight: bold;
          margin-top: 15px;
        }

        .certificate-title-en {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .certificate-body {
          text-align: center;
          margin-top: 30px;
          font-size: 16px;
          line-height: 1.8;
        }

        .certificate-description {
          max-width: 800px;
          margin: 15px auto;
          font-size: 15px;
        }

        .recipient-name {
          font-size: 28px;
          font-weight: bold;
          border-bottom: 2px solid #000;
          display: inline-block;
          padding: 0 30px;
          margin: 10px 0;
          min-width: 350px;
        }

        .rank-box {
          font-size: 20px;
          font-weight: bold;
          border: 2px solid #000;
          padding: 8px 20px;
          display: inline-block;
          margin: 15px 0;
        }

        .certificate-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
          padding: 0 40px;
          align-items: flex-end;
        }

        .signature-box {
          text-align: center;
          width: 220px;
        }

        .signature-line {
          border-top: 1px solid #000;
          margin-top: 40px;
          padding-top: 5px;
          font-size: 13px;
        }

        .stamp-box {
          width: 110px;
          height: 110px;
          border: 2px dashed #000;
          border-radius: 50%;
          margin: 0 auto;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 11px;
          text-align: center;
        }
      `}</style>

      {/* ======================================================
          SCREEN CONTROLS
      ======================================================= */}

      <main className="certificate-screen mx-auto max-w-5xl p-6">

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f2a47]">
                Academic Recognition
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950">
                Achievement Certificates
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Grade {section.grade.level}
                {section.label} •{" "}
                {section.schoolYear.label}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {requestedStudentId
                  ? "Individual certificate"
                  : `Top ${selectedStudents.length} students`}
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <Link
                href={`/dashboard/teacher/homeroom/${sectionId}/roster`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Back to Results
              </Link>

              <CertificatePrintButton />

            </div>

          </div>

        </div>

        <div className="space-y-4">

          {selectedStudents.map(
            (row) => (

              <div
                key={row.student.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Rank {row.rank}
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      {row.student.fullName}
                    </h2>

                  </div>

                  <div className="text-right">

                    <p className="text-2xl font-black text-[#0f2a47]">
                      {row.finalAverage?.toFixed(1)}
                    </p>

                    <p className="text-xs text-slate-400">
                      Final Average / 100
                    </p>

                  </div>

                </div>

              </div>

            )
          )}

          {selectedStudents.length === 0 && (

            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">

              <p className="font-bold text-slate-700">
                No qualifying student results are available.
              </p>

            </div>

          )}

        </div>

      </main>

      {/* ======================================================
          PRINT-ONLY CERTIFICATES
      ======================================================= */}

      <div className="certificate-print-root">

        {selectedStudents.map(
          (row) => {

            const rankText =
              getRankText(row.rank);

            const rankAmharic =
              getRankAmharic(row.rank);

            return (

              <div
                key={`print-${row.student.id}`}
                className="certificate-page"
              >

                {/* HEADER */}

                <div className="certificate-header">

                  <h1 className="school-name-am">
                    LEVEL UP ACADEMY
                  </h1>

                  <div className="school-name-en">
                    LEVEL UP ACADEMY
                  </div>

                  <div className="certificate-title-am">
                    ACADEMIC ACHIEVEMENT
                  </div>

                  <div className="certificate-title-en">
                    Certificate of Academic Recognition
                  </div>

                </div>

                {/* BODY */}

                <div className="certificate-body">

                  <div className="certificate-description">

                    Academic achievement and outstanding performance are recognized with pride.
                    {section.schoolYear.label}{" "}
                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.

                  </div>

                  <div>

                    <span className="recipient-name">
                      {row.student.fullName}
                    </span>

                  </div>

                  <div>

                    <div className="rank-box">

                      Academic achievement and outstanding performance are recognized with pride.

                      <span>
                        {rankAmharic} (
                        {rankText}
                        )
                      </span>{" "}

                      Academic achievement and outstanding performance are recognized with pride.

                    </div>

                  </div>

                  <div className="certificate-description">

                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.
                    Academic achievement and outstanding performance are recognized with pride.

                    <br />

                    <i>
                      Proudly presented in recognition
                      of securing top academic rank
                      in the class. Keep up the
                      exceptional work!
                    </i>

                  </div>

                </div>

                {/* FOOTER */}

                <div className="certificate-footer">

                  <div className="signature-box">

                    <div className="signature-line">

                      {teacher.signatureUrl && (
                        <img
                          src={teacher.signatureUrl}
                          alt="Homeroom teacher signature"
                          className="mx-auto mb-1 h-14 max-w-[180px] object-contain"
                        />
                      )}

                      <strong>{teacher.fullName}</strong>
                      <br />
                      Homeroom Teacher Signature

                    </div>

                  </div>

                  <div className="signature-box">

                    <div className="stamp-box">

                      {schoolSettings?.stampUrl ? (
                        <img
                          src={schoolSettings.stampUrl}
                          alt="School seal"
                          className="mx-auto h-20 w-20 object-contain"
                        />
                      ) : (
                        <>
                          {schoolSettings?.schoolName || "LEVEL UP ACADEMY"}
                          <br />
                          SCHOOL SEAL
                        </>
                      )}

                    </div>

                  </div>

                  <div className="signature-box">

                    <div className="signature-line">

                      {schoolSettings?.directorSignatureUrl && (
                        <img
                          src={schoolSettings.directorSignatureUrl}
                          alt="School principal signature"
                          className="mx-auto mb-1 h-14 max-w-[180px] object-contain"
                        />
                      )}

                      <strong>
                        {schoolSettings?.directorName || "Principal"}
                      </strong>
                      <br />
                      School Principal Signature

                    </div>

                  </div>

                </div>

              </div>

            );
          }
        )}

      </div>
    </>
  );
}

