"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { regenerateClassNumbers } from "@/lib/class-number";

type AcademicPerformance = {
  average: number | null;
  completedSemesters: number;
};

type StudentForShuffle = {
  id: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | null;
  previousSectionId: string;
  previousSectionLabel: string;
  previousAverage: number | null;
  completedSemesters: number;
};

type Proposal = {
  studentId: string;
  proposedSectionId: string;
  average: number | null;
  gender: "MALE" | "FEMALE" | null;
};

type SectionAcademicStat = {
  sectionId: string;
  sectionLabel: string;
  studentCount: number;
  studentsWithResults: number;
  average: number | null;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * Finds the school year immediately before the destination school year.
 */
async function getPreviousSchoolYear(
  schoolYearId: string
) {
  const currentYear =
    await prisma.schoolYear.findUnique({
      where: {
        id: schoolYearId,
      },
      select: {
        id: true,
        label: true,
        startDate: true,
      },
    });

  if (!currentYear) {
    return null;
  }

  return prisma.schoolYear.findFirst({
    where: {
      startDate: {
        lt: currentYear.startDate,
      },
    },
    orderBy: {
      startDate: "desc",
    },
    select: {
      id: true,
      label: true,
      startDate: true,
    },
  });
}

/**
 * Previous-year performance rules:
 *
 * SUBJECT COMPLETE:
 * - assessment maximums total exactly 100
 * - every required assessment has a published mark
 *
 * SEMESTER COMPLETE:
 * - every required subject is complete
 *
 * YEAR PERFORMANCE:
 * - average completed semester averages only
 * - incomplete semesters are ignored
 * - missing/incomplete results are NOT treated as zero
 */
async function calculatePreviousYearPerformance(
  previousYearId: string,
  studentIds: string[]
) {
  if (studentIds.length === 0) {
    return {
      studentPerformance:
        new Map<string, AcademicPerformance>(),
      previousSectionStats:
        [] as SectionAcademicStat[],
    };
  }

  const previousSections =
    await prisma.section.findMany({
      where: {
        schoolYearId: previousYearId,
      },
      orderBy: {
        label: "asc",
      },
      select: {
        id: true,
        label: true,

        subjectAssignments: {
          select: {
            subjectId: true,
          },
        },

        enrollments: {
          where: {
            status: "ACTIVE",
          },
          select: {
            studentId: true,
          },
        },
      },
    });

  const previousEnrollmentRows =
    await prisma.studentEnrollment.findMany({
      where: {
        schoolYearId: previousYearId,
        studentId: {
          in: studentIds,
        },
        status: "ACTIVE",
      },
      select: {
        studentId: true,
        sectionId: true,
      },
    });

  const previousEnrollmentMap =
    new Map(
      previousEnrollmentRows.map(
        (row) => [
          row.studentId,
          row.sectionId,
        ]
      )
    );

  const resultCards =
    await prisma.resultCard.findMany({
      where: {
        studentId: {
          in: studentIds,
        },

        status: "PUBLISHED",

        exam: {
          schoolYearId:
            previousYearId,
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
    });

  const semesters =
    await prisma.semester.findMany({
      where: {
        schoolYearId:
          previousYearId,
      },

      orderBy: {
        number: "asc",
      },

      select: {
        id: true,
        number: true,
        name: true,
      },
    });

  const exams =
    await prisma.exam.findMany({
      where: {
        schoolYearId:
          previousYearId,
      },

      select: {
        id: true,
        subjectId: true,
        semesterId: true,
        maxMarks: true,
      },
    });

  const examsBySemesterSubject =
    new Map<string, typeof exams>();

  for (const exam of exams) {
    const key =
      `${exam.semesterId}:${exam.subjectId}`;

    const list =
      examsBySemesterSubject.get(key) ??
      [];

    list.push(exam);

    examsBySemesterSubject.set(
      key,
      list
    );
  }

  /**
   * Result lookup:
   *
   * studentId + examId -> actual mark
   */
  const resultMap =
    new Map<
      string,
      {
        marks: number;
        maxMarks: number;
      }
    >();

  for (const card of resultCards) {
    for (const result of card.results) {
      resultMap.set(
        `${card.studentId}:${card.examId}`,
        {
          marks: Number(
            result.marksObtained
          ),
          maxMarks: Number(
            result.maxMarks
          ),
        }
      );
    }
  }

  function calculateStudent(
    studentId: string,
    sectionId: string
  ): AcademicPerformance {
    const section =
      previousSections.find(
        (item) =>
          item.id === sectionId
      );

    if (!section) {
      return {
        average: null,
        completedSemesters: 0,
      };
    }

    /**
     * Required subjects come from the student's
     * previous-year section.
     */
    const requiredSubjectIds = [
      ...new Set(
        section.subjectAssignments.map(
          (assignment) =>
            assignment.subjectId
        )
      ),
    ];

    if (
      requiredSubjectIds.length === 0
    ) {
      return {
        average: null,
        completedSemesters: 0,
      };
    }

    const completedSemesterAverages:
      number[] = [];

    for (const semester of semesters) {
      let semesterComplete = true;

      const subjectScores: number[] =
        [];

      for (const subjectId of requiredSubjectIds) {
        const subjectExams =
          examsBySemesterSubject.get(
            `${semester.id}:${subjectId}`
          ) ?? [];

        /**
         * A subject with no assessments is incomplete.
         */
        if (
          subjectExams.length === 0
        ) {
          semesterComplete = false;
          break;
        }

        /**
         * Assessment maximums must total exactly 100.
         */
        const assessmentMaximum =
          subjectExams.reduce(
            (sum, exam) =>
              sum +
              Number(exam.maxMarks),
            0
          );

        if (
          Math.abs(
            assessmentMaximum - 100
          ) > 0.0001
        ) {
          semesterComplete = false;
          break;
        }

        let subjectTotal = 0;

        for (const exam of subjectExams) {
          const result =
            resultMap.get(
              `${studentId}:${exam.id}`
            );

          /**
           * Every required assessment must
           * have a published result.
           */
          if (!result) {
            semesterComplete = false;
            break;
          }

          const marks =
            Number(result.marks);

          if (
            !Number.isFinite(marks)
          ) {
            semesterComplete = false;
            break;
          }

          subjectTotal += marks;
        }

        if (!semesterComplete) {
          break;
        }

        /**
         * Prevent impossible totals.
         */
        if (subjectTotal > 100) {
          semesterComplete = false;
          break;
        }

        subjectScores.push(
          subjectTotal
        );
      }

      /**
       * A semester is complete only when
       * every required subject is complete.
       */
      if (
        semesterComplete &&
        subjectScores.length ===
          requiredSubjectIds.length
      ) {
        const semesterAverage =
          subjectScores.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          subjectScores.length;

        completedSemesterAverages.push(
          semesterAverage
        );
      }
    }

    /**
     * No completed semesters = no academic score.
     */
    if (
      completedSemesterAverages.length ===
      0
    ) {
      return {
        average: null,
        completedSemesters: 0,
      };
    }

    /**
     * Average only completed semesters.
     */
    const yearAverage =
      completedSemesterAverages.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      completedSemesterAverages.length;

    return {
      average: round1(yearAverage),
      completedSemesters:
        completedSemesterAverages.length,
    };
  }

  const studentPerformance =
    new Map<
      string,
      AcademicPerformance
    >();

  for (const studentId of studentIds) {
    const sectionId =
      previousEnrollmentMap.get(
        studentId
      );

    if (!sectionId) {
      studentPerformance.set(
        studentId,
        {
          average: null,
          completedSemesters: 0,
        }
      );

      continue;
    }

    studentPerformance.set(
      studentId,
      calculateStudent(
        studentId,
        sectionId
      )
    );
  }

  /**
   * Statistics for the previous-year
   * sections.
   */
  const previousSectionStats:
    SectionAcademicStat[] =
    previousSections.map(
      (section) => {
        const sectionStudentIds =
          section.enrollments.map(
            (enrollment) =>
              enrollment.studentId
          );

        const values =
          sectionStudentIds
            .map(
              (studentId) =>
                studentPerformance.get(
                  studentId
                )?.average ?? null
            )
            .filter(
              (
                value
              ): value is number =>
                value !== null
            );

        const average =
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

        return {
          sectionId:
            section.id,
          sectionLabel:
            section.label,
          studentCount:
            sectionStudentIds.length,
          studentsWithResults:
            values.length,
          average,
        };
      }
    );

  return {
    studentPerformance,
    previousSectionStats,
  };
}

/**
 * Used by the admin page if needed.
 */
export async function getShuffleOptions() {
  await requireRole([
    "ADMIN",
  ]);

  const [
    schoolYears,
    grades,
  ] = await Promise.all([
    prisma.schoolYear.findMany({
      orderBy: {
        startDate: "desc",
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

  return {
    schoolYears,
    grades,
  };
}

/**
 * Returns destination sections.
 *
 * IMPORTANT:
 * These are the sections of the NEW school year
 * and selected destination grade.
 */
export async function getShuffleSections(
  schoolYearId: string,
  gradeId: string
) {
  await requireRole([
    "ADMIN",
  ]);

  if (
    !schoolYearId ||
    !gradeId
  ) {
    return {
      success: false,
      error:
        "School year and grade are required.",
      sections: [],
    };
  }

  const sections =
    await prisma.section.findMany({
      where: {
        schoolYearId,
        gradeId,
      },

      orderBy: {
        label: "asc",
      },

      select: {
        id: true,
        label: true,

        _count: {
          select: {
            enrollments: {
              where: {
                status: "ACTIVE",
              },
            },
          },
        },
      },
    });

  return {
    success: true,

    sections:
      sections.map(
        (section) => ({
          id: section.id,
          label: section.label,
          studentCount:
            section._count.enrollments,
        })
      ),
  };
}

/**
 * Generates a promotion shuffle.
 *
 * DESTINATION:
 *   selected school year + selected grade
 *
 * SOURCE:
 *   immediately previous school year
 *   + immediately previous grade
 *
 * INCLUDED:
 *   ACTIVE students from the previous grade/year
 *
 * EXCLUDED:
 *   new students
 *   students from unrelated grades
 *   inactive previous-year enrollments
 *
 * IMPORTANT:
 * This function does NOT create the new-year
 * StudentEnrollment rows.
 *
 * Finalize does that.
 */
export async function generateShuffle(
  formData: FormData
) {
  const admin =
    await requireRole([
      "ADMIN",
    ]);

  const schoolYearId =
    String(
      formData.get(
        "schoolYearId"
      ) || ""
    );

  const gradeId =
    String(
      formData.get(
        "gradeId"
      ) || ""
    );

  const sectionIds =
    formData
      .getAll("sectionIds")
      .map(String)
      .filter(Boolean);

  const useAcademic =
    formData.get(
      "balanceAcademic"
    ) === "true";

  const balanceSize =
    formData.get(
      "balanceSize"
    ) !== "false";

  const balanceGender =
    formData.get(
      "balanceGender"
    ) === "true";

  const minimizeStaying =
    formData.get(
      "minimizeStaying"
    ) === "true";

  if (
    !schoolYearId ||
    !gradeId
  ) {
    return {
      error:
        "School year and grade are required.",
    };
  }

  if (
    sectionIds.length < 2
  ) {
    return {
      error:
        "Select at least two destination sections to shuffle.",
    };
  }

  if (
    !useAcademic &&
    !balanceSize &&
    !balanceGender &&
    !minimizeStaying
  ) {
    return {
      error:
        "Select at least one balancing method.",
    };
  }

  const [
    schoolYear,
    grade,
  ] = await Promise.all([
    prisma.schoolYear.findUnique({
      where: {
        id: schoolYearId,
      },

      select: {
        id: true,
        label: true,
        startDate: true,
      },
    }),

    prisma.grade.findUnique({
      where: {
        id: gradeId,
      },

      select: {
        id: true,
        level: true,
      },
    }),
  ]);

  if (!schoolYear) {
    return {
      error:
        "Destination school year not found.",
    };
  }

  if (!grade) {
    return {
      error:
        "Destination grade not found.",
    };
  }

  /**
   * Verify that every selected section belongs
   * to the selected destination year and grade.
   */
  const sections =
    await prisma.section.findMany({
      where: {
        id: {
          in: sectionIds,
        },

        schoolYearId,
        gradeId,
      },

      orderBy: {
        label: "asc",
      },

      select: {
        id: true,
        label: true,
      },
    });

  if (
    sections.length !==
    sectionIds.length
  ) {
    return {
      error:
        "One or more selected sections do not belong to the selected school year and grade.",
    };
  }

  if (
    sections.length < 2
  ) {
    return {
      error:
        "At least two destination sections are required.",
    };
  }

  /**
   * ---------------------------------------------------
   * SOURCE OF STUDENTS
   * ---------------------------------------------------
   *
   * Example:
   *
   * Destination:
   *   2019 E.C. Grade 8
   *
   * Source:
   *   2018 E.C. Grade 7
   *
   * Only those previous-year students are shuffled.
   */
  const previousYear =
    await getPreviousSchoolYear(
      schoolYearId
    );

  if (!previousYear) {
    return {
      error:
        "There is no previous school year available for promotion shuffle.",
    };
  }

  /**
   * The source grade is exactly one level below
   * the destination grade.
   */
  const previousGrade =
    await prisma.grade.findUnique({
      where: {
        level:
          grade.level - 1,
      },

      select: {
        id: true,
        level: true,
      },
    });

  /**
   * Grade 1 has no previous grade.
   */
  if (!previousGrade) {
    return {
      error:
        `Grade ${grade.level} has no previous grade to promote from. New students should be enrolled normally.`,
    };
  }

  /**
   * Find all source sections belonging to:
   *
   * previous school year
   * previous grade
   */
  const previousSections =
    await prisma.section.findMany({
      where: {
        schoolYearId:
          previousYear.id,

        gradeId:
          previousGrade.id,
      },

      select: {
        id: true,
        label: true,
      },
    });

  if (
    previousSections.length ===
    0
  ) {
    return {
      error:
        `No sections were found for Grade ${previousGrade.level} in ${previousYear.label} E.C.`,
    };
  }

  /**
   * ---------------------------------------------------
   * ELIGIBLE STUDENTS
   * ---------------------------------------------------
   *
   * These are the students who:
   *
   * 1. already exist in Student
   * 2. were ACTIVE in the previous school year
   * 3. were enrolled in the immediately previous grade
   *
   * New students are NOT included.
   */
  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        schoolYearId:
          previousYear.id,

        sectionId: {
          in:
            previousSections.map(
              (section) =>
                section.id
            ),
        },

        status: "ACTIVE",
      },

      select: {
        studentId: true,
        sectionId: true,

        student: {
          select: {
            id: true,
            fullName: true,
            gender: true,
          },
        },

        section: {
          select: {
            label: true,
          },
        },
      },
    });

  if (
    enrollments.length ===
    0
  ) {
    return {
      error:
        `There are no active Grade ${previousGrade.level} students from ${previousYear.label} E.C. eligible for promotion shuffle.`,
    };
  }

  /**
   * Prevent duplicate student IDs from ever
   * entering a shuffle batch.
   */
  const uniqueEnrollments =
    Array.from(
      new Map(
        enrollments.map(
          (enrollment) => [
            enrollment.studentId,
            enrollment,
          ]
        )
      ).values()
    );

  const studentIds =
    uniqueEnrollments.map(
      (enrollment) =>
        enrollment.studentId
    );

  /**
   * Calculate previous-year academic
   * performance.
   */
  const performance =
    await calculatePreviousYearPerformance(
      previousYear.id,
      studentIds
    );

  const studentPerformance =
    performance.studentPerformance;

  /**
   * Build shuffle students.
   */
  const students:
    StudentForShuffle[] =
    uniqueEnrollments.map(
      (enrollment) => {
        const academic =
          studentPerformance.get(
            enrollment.studentId
          );

        return {
          id:
            enrollment.student.id,

          fullName:
            enrollment.student.fullName,

          gender:
            enrollment.student.gender,

          previousSectionId:
            enrollment.sectionId,

          previousSectionLabel:
            enrollment.section
              .label,

          previousAverage:
            academic?.average ??
            null,

          completedSemesters:
            academic?.completedSemesters ??
            0,
        };
      }
    );

  /**
   * ---------------------------------------------------
   * BALANCING STATE
   * ---------------------------------------------------
   */
  const sectionStats =
    new Map<
      string,
      {
        count: number;
        male: number;
        female: number;
        unknown: number;
        academicTotal: number;
        academicCount: number;
      }
    >();

  for (const section of sections) {
    sectionStats.set(
      section.id,
      {
        count: 0,
        male: 0,
        female: 0,
        unknown: 0,
        academicTotal: 0,
        academicCount: 0,
      }
    );
  }

  /**
   * Students with known academic performance
   * are processed strongest -> weakest.
   *
   * This distributes strong students across
   * sections rather than grouping them together.
   *
   * Students without completed results are
   * processed afterward and are NOT treated as
   * zero academically.
   */
  const sortedStudents =
    [...students].sort(
      (a, b) => {
        if (useAcademic) {
          const aAverage =
            a.previousAverage ??
            null;

          const bAverage =
            b.previousAverage ??
            null;

          if (
            aAverage !== null &&
            bAverage !== null
          ) {
            if (
              bAverage !==
              aAverage
            ) {
              return (
                bAverage -
                aAverage
              );
            }
          } else if (
            aAverage !== null
          ) {
            return -1;
          } else if (
            bAverage !== null
          ) {
            return 1;
          }
        }

        return a.fullName.localeCompare(
          b.fullName
        );
      }
    );

  const proposals:
    Proposal[] = [];

  for (const student of sortedStudents) {
    const candidates =
      sections
        .map((section) => {
          const stats =
            sectionStats.get(
              section.id
            )!;

          const genderCount =
            student.gender ===
            "MALE"
              ? stats.male
              : student.gender ===
                  "FEMALE"
                ? stats.female
                : stats.unknown;

          /**
           * Calculate what the section's
           * academic average would become
           * if this student were placed there.
           *
           * Students without results do not
           * contribute to academicTotal.
           */
          const projectedAcademicAverage =
            student.previousAverage !==
            null
              ? (
                  stats.academicTotal +
                  student.previousAverage
                ) /
                Math.max(
                  1,
                  stats.academicCount +
                    1
                )
              : stats.academicCount >
                  0
                ? stats.academicTotal /
                  stats.academicCount
                : 0;

          /**
           * 1 means the student stays in the
           * same section, 0 means they move.
           */
          const staying =
            student.previousSectionId ===
            section.id
              ? 1
              : 0;

          return {
            section,
            stats,
            genderCount,
            projectedAcademicAverage,
            staying,
          };
        })
        .sort(
          (a, b) => {
            /**
             * First: section size.
             */
            if (balanceSize) {
              if (
                a.stats.count !==
                b.stats.count
              ) {
                return (
                  a.stats.count -
                  b.stats.count
                );
              }
            }

            /**
             * Second: academic balance.
             */
            if (useAcademic) {
              if (
                a.projectedAcademicAverage !==
                b.projectedAcademicAverage
              ) {
                return (
                  a.projectedAcademicAverage -
                  b.projectedAcademicAverage
                );
              }
            }

            /**
             * Third: gender balance.
             */
            if (balanceGender) {
              if (
                a.genderCount !==
                b.genderCount
              ) {
                return (
                  a.genderCount -
                  b.genderCount
                );
              }
            }

            /**
             * Fourth: minimize staying.
             */
            if (minimizeStaying) {
              if (
                a.staying !==
                b.staying
              ) {
                return (
                  a.staying -
                  b.staying
                );
              }
            }

            /**
             * Stable deterministic tie-breaker.
             */
            return a.section.label.localeCompare(
              b.section.label
            );
          }
        );

    const chosen =
      candidates[0];

    const stats =
      chosen.stats;

    stats.count++;

    if (
      student.previousAverage !==
      null
    ) {
      stats.academicTotal +=
        student.previousAverage;

      stats.academicCount++;
    }

    if (
      student.gender ===
      "MALE"
    ) {
      stats.male++;
    } else if (
      student.gender ===
      "FEMALE"
    ) {
      stats.female++;
    } else {
      stats.unknown++;
    }

    proposals.push({
      studentId:
        student.id,

      proposedSectionId:
        chosen.section.id,

      average:
        student.previousAverage,

      gender:
        student.gender,
    });
  }

  /**
   * ---------------------------------------------------
   * SAVE DRAFT
   * ---------------------------------------------------
   *
   * We save proposals only.
   *
   * ACTUAL student enrollments are NOT changed
   * until the admin presses Finalize.
   */
  const batch =
    await prisma.$transaction(
      async (tx) => {
        const createdBatch =
          await tx.sectionShuffleBatch.create(
            {
              data: {
                gradeId,

                schoolYearId,

                status:
                  "DRAFT",

                createdById:
                  admin.user.id,

                selectedSectionIds:
                  sections.map(
                    (section) =>
                      section.id
                  ),

                balancingRules: {
                  previousYearAcademic:
                    useAcademic,

                  sectionSizes:
                    balanceSize,

                  gender:
                    balanceGender,

                  minimizeStaying,

                  sourceSchoolYearId:
                    previousYear.id,

                  sourceSchoolYearLabel:
                    previousYear.label,

                  sourceGradeLevel:
                    previousGrade.level,

                  destinationSchoolYearId:
                    schoolYear.id,

                  destinationSchoolYearLabel:
                    schoolYear.label,

                  destinationGradeLevel:
                    grade.level,
                },
              },
            }
          );

        await tx.sectionShuffleProposal.createMany(
          {
            data:
              proposals.map(
                (proposal) => ({
                  batchId:
                    createdBatch.id,

                  studentId:
                    proposal.studentId,

                  proposedSectionId:
                    proposal.proposedSectionId,
                })
              ),
          }
        );

        return createdBatch;
      }
    );

  await logAction(
    admin.user.id,
    "SECTION_SHUFFLE_CREATED",
    "SectionShuffleBatch",
    batch.id,
    {
      batchId:
        batch.id,

      destinationSchoolYearId:
        schoolYear.id,

      destinationSchoolYearLabel:
        schoolYear.label,

      destinationGradeLevel:
        grade.level,

      sourceSchoolYearId:
        previousYear.id,

      sourceSchoolYearLabel:
        previousYear.label,

      sourceGradeLevel:
        previousGrade.level,

      selectedSectionIds:
        sections.map(
          (section) =>
            section.id
        ),

      studentCount:
        students.length,

      sectionCount:
        sections.length,

      balancing: {
        previousYearAcademic:
          useAcademic,

        sectionSizes:
          balanceSize,

        gender:
          balanceGender,

        minimizeStaying,
      },
    }
  );

  revalidatePath(
    "/dashboard/admin/shuffle"
  );

  return {
    success: true,
    batchId: batch.id,
  };
}

/**
 * Loads a saved shuffle draft.
 */
export async function loadShufflePreview(
  batchId: string
) {
  await requireRole([
    "ADMIN",
  ]);

  const batch =
    await prisma.sectionShuffleBatch.findUnique(
      {
        where: {
          id: batchId,
        },

        include: {
          grade: true,

          schoolYear: true,

          proposals: {
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  gender: true,
                },
              },

              proposedSection: {
                select: {
                  id: true,
                  label: true,
                },
              },
            },
          },
        },
      }
    );

  if (!batch) {
    return {
      error:
        "Shuffle batch not found.",
    };
  }

  const studentIds =
    batch.proposals.map(
      (proposal) =>
        proposal.studentId
    );

  /**
   * Source year.
   */
  const previousYear =
    await getPreviousSchoolYear(
      batch.schoolYearId
    );

  let studentPerformance =
    new Map<
      string,
      AcademicPerformance
    >();

  let previousEnrollments:
    {
      studentId: string;
      sectionId: string;
      section: {
        label: string;
      };
    }[] = [];

  let previousSectionStats:
    SectionAcademicStat[] = [];

  if (previousYear) {
    const result =
      await calculatePreviousYearPerformance(
        previousYear.id,
        studentIds
      );

    studentPerformance =
      result.studentPerformance;

    previousSectionStats =
      result.previousSectionStats;

    previousEnrollments =
      await prisma.studentEnrollment.findMany(
        {
          where: {
            schoolYearId:
              previousYear.id,

            studentId: {
              in: studentIds,
            },

            status: "ACTIVE",
          },

          select: {
            studentId: true,
            sectionId: true,

            section: {
              select: {
                label: true,
              },
            },
          },
        }
      );
  }

  const previousEnrollmentMap =
    new Map(
      previousEnrollments.map(
        (enrollment) => [
          enrollment.studentId,
          enrollment,
        ]
      )
    );

  /**
   * IMPORTANT:
   *
   * We intentionally look at the previous-year
   * enrollment here.
   *
   * A promoted student does not need a destination
   * year enrollment yet.
   */
  return {
    batch: {
      id: batch.id,

      status:
        batch.status,

      gradeLevel:
        batch.grade.level,

      schoolYearLabel:
        batch.schoolYear.label,

      createdAt:
        batch.createdAt,
    },

    previousYear:
      previousYear
        ? {
            id:
              previousYear.id,

            label:
              previousYear.label,

            sections:
              previousSectionStats,
          }
        : null,

    proposals:
      batch.proposals.map(
        (proposal) => {
          const previous =
            previousEnrollmentMap.get(
              proposal.studentId
            );

          const performance =
            studentPerformance.get(
              proposal.studentId
            );

          return {
            studentId:
              proposal.studentId,

            fullName:
              proposal.student.fullName,

            gender:
              proposal.student.gender,

            /**
             * This is the student's ACTUAL
             * previous-year section.
             */
            currentSection:
              previous?.section.label ??
              "—",

            proposedSection:
              proposal.proposedSection
                .label,

            /**
             * Before finalization, "same section"
             * means the proposed destination section
             * has the same label as the student's
             * previous section.
             *
             * This is only a display indicator.
             */
            sameSection:
              previous?.sectionId ===
              proposal.proposedSectionId,

            previousSection:
              previous?.section.label ??
              null,

            previousAverage:
              performance?.average ??
              null,

            completedSemesters:
              performance?.completedSemesters ??
              0,
          };
        }
      ),
  };
}

/**
 * ---------------------------------------------------
 * FINALIZE PROMOTION SHUFFLE
 * ---------------------------------------------------
 *
 * This is the important part.
 *
 * For every promoted student:
 *
 * - create the destination-year enrollment if
 *   it does not exist
 * - update it if it already exists
 * - update Student.currentSectionId
 *
 * New students are untouched.
 *
 * Existing destination-year enrollment rows are
 * safely updated rather than duplicated.
 */
export async function finalizeShuffle(
  batchId: string
) {
  const admin =
    await requireRole([
      "ADMIN",
    ]);

  if (!batchId) {
    return {
      error:
        "Shuffle batch was not specified.",
    };
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const batch =
            await tx.sectionShuffleBatch.findUnique(
              {
                where: {
                  id: batchId,
                },

                include: {
                  proposals: {
                    select: {
                      studentId: true,
                      proposedSectionId:
                        true,
                    },
                  },

                  grade: {
                    select: {
                      id: true,
                      level: true,
                    },
                  },

                  schoolYear: {
                    select: {
                      id: true,
                      label: true,
                    },
                  },
                },
              }
            );

          if (!batch) {
            throw new Error(
              "Shuffle batch not found."
            );
          }

          if (
            batch.status !==
            "DRAFT"
          ) {
            throw new Error(
              "This shuffle has already been finalized or cancelled."
            );
          }

          if (
            batch.proposals.length ===
            0
          ) {
            throw new Error(
              "This shuffle contains no student proposals."
            );
          }

          /**
           * Verify every proposed section belongs
           * to the destination school year and
           * destination grade before making changes.
           */
          const proposedSectionIds =
            [
              ...new Set(
                batch.proposals.map(
                  (proposal) =>
                    proposal.proposedSectionId
                )
              ),
            ];

          const validSections =
            await tx.section.findMany({
              where: {
                id: {
                  in:
                    proposedSectionIds,
                },

                schoolYearId:
                  batch.schoolYearId,

                gradeId:
                  batch.gradeId,
              },

              select: {
                id: true,
              },
            });

          if (
            validSections.length !==
            proposedSectionIds.length
          ) {
            throw new Error(
              "One or more proposed sections no longer belong to the destination school year and grade."
            );
          }

          /**
           * Process every promoted student.
           */
          for (const proposal of batch.proposals) {
            /**
             * Check whether the student already has
             * a destination-year enrollment.
             */
            const existingEnrollment =
              await tx.studentEnrollment.findUnique(
                {
                  where: {
                    studentId_schoolYearId:
                      {
                        studentId:
                          proposal.studentId,

                        schoolYearId:
                          batch.schoolYearId,
                      },
                  },

                  select: {
                    id: true,
                    status: true,
                  },
                }
              );

            if (
              existingEnrollment
            ) {
              /**
               * The student was already enrolled
               * in the destination school year.
               *
               * We safely move that enrollment
               * to the shuffled section.
               */
              await tx.studentEnrollment.update(
                {
                  where: {
                    id:
                      existingEnrollment.id,
                  },

                  data: {
                    sectionId:
                      proposal.proposedSectionId,

                    status:
                      "ACTIVE",
                  },
                }
              );
            } else {
              /**
               * Normal promotion case:
               *
               * the student has not yet been enrolled
               * in the new school year.
               *
               * Create the enrollment now.
               */
              await tx.studentEnrollment.create(
                {
                  data: {
                    studentId:
                      proposal.studentId,

                    schoolYearId:
                      batch.schoolYearId,

                    sectionId:
                      proposal.proposedSectionId,

                    status:
                      "ACTIVE",
                  },
                }
              );
            }

            /**
             * Keep the student's quick-access
             * current section synchronized.
             */
            await tx.student.update({
              where: {
                id:
                  proposal.studentId,
              },

              data: {
                currentSectionId:
                  proposal.proposedSectionId,
              },
            });
          }

          /**
           * Mark the batch finalized only after
           * every enrollment update succeeds.
           */
          const updatedBatch =
            await tx.sectionShuffleBatch.update(
              {
                where: {
                  id: batchId,
                },

                data: {
                  status:
                    "FINALIZED",

                  finalizedAt:
                    new Date(),
                },
              }
            );

          return {
            batch: updatedBatch,
            finalizedSectionIds:
              proposedSectionIds,
          };
        }
      );

    await logAction(
      admin.user.id,
      "SECTION_SHUFFLE_FINALIZED",
      "SectionShuffleBatch",
      batchId,
      {
        batchId,

        finalizedAt:
          result.batch.finalizedAt,

        status:
          result.batch.status,
      }
    );

    // Regenerate Class Numbers for every section that received students.
    const finalizedSectionIds =
      result.finalizedSectionIds;
    for (const sid of finalizedSectionIds) {
      await regenerateClassNumbers(sid);
    }

    revalidatePath(
      "/dashboard/admin/shuffle"
    );

    revalidatePath(
      "/dashboard/admin/sections"
    );

    revalidatePath(
      "/dashboard/admin/students"
    );

    revalidatePath(
      "/dashboard/admin/grades"
    );

    return {
      success: true,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to finalize shuffle.",
    };
  }
}
