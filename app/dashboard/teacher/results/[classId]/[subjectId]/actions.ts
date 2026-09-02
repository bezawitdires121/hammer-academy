"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const examSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  semesterId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  maxMarks: z.number().finite().gt(0).lte(100),
});

const examIdSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  examId: z.string().min(1),
});

const marksSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  semesterId: z.string().min(1),
  examId: z.string().min(1),
  entries: z.array(
    z.object({
      studentId: z.string().min(1),
      marksObtained: z.number().finite().min(0),
      maxMarks: z.number().finite().gt(0).lte(100),
    })
  ),
});


async function rejectLockedSemester(semesterId: string) {
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    select: { isLocked: true },
  });
  if (semester?.isLocked) {
    return { error: "This semester is locked. Results cannot be changed." };
  }
  return null;
}
async function getTeacherAssignment(
  classId: string,
  subjectId: string
) {
  const teacher = await requireRole(["TEACHER"]);

  const teacherProfile = await prisma.teacher.findUnique({
    where: {
      userId: teacher.user.id,
    },
  });

  if (!teacherProfile || teacherProfile.status !== "ACTIVE") {
    return {
      error: "Your teacher account is inactive or unavailable.",
      teacher,
      teacherProfile: null,
      assignment: null,
    };
  }

  const assignment = await prisma.teacherAssignment.findUnique({
    where: {
      sectionId_subjectId: {
        sectionId: classId,
        subjectId,
      },
    },
    include: {
      section: {
        select: {
          id: true,
          schoolYearId: true,
        },
      },
    },
  });

  if (!assignment || assignment.teacherId !== teacherProfile.id) {
    return {
      error:
        "You are not assigned to teach this subject for this section.",
      teacher,
      teacherProfile,
      assignment: null,
    };
  }

  return {
    error: null,
    teacher,
    teacherProfile,
    assignment,
  };
}
async function getTeacherSemesterAssignment(
  classId: string,
  subjectId: string,
  semesterId: string
) {
  const teacher = await requireRole(["TEACHER"]);

  const teacherProfile = await prisma.teacher.findUnique({
    where: {
      userId: teacher.user.id,
    },
  });

  if (!teacherProfile || teacherProfile.status !== "ACTIVE") {
    return {
      error: "Your teacher account is inactive or unavailable.",
      teacher,
      teacherProfile: null,
      assignment: null,
      historicalAssignment: null,
      semester: null,
    };
  }

  const section = await prisma.section.findUnique({
    where: {
      id: classId,
    },
    select: {
      id: true,
      schoolYearId: true,
    },
  });

  if (!section) {
    return {
      error: "Section not found.",
      teacher,
      teacherProfile,
      assignment: null,
      historicalAssignment: null,
      semester: null,
    };
  }

  const semester = await prisma.semester.findFirst({
    where: {
      id: semesterId,
      schoolYearId: section.schoolYearId,
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!semester) {
    return {
      error:
        "The selected semester does not belong to this section's school year.",
      teacher,
      teacherProfile,
      assignment: null,
      historicalAssignment: null,
      semester: null,
    };
  }

  const historicalAssignment =
    await prisma.teacherAssignmentHistory.findFirst({
      where: {
        teacherId: teacherProfile.id,
        sectionId: classId,
        subjectId,
        schoolYearId: section.schoolYearId,
        startDate: {
          lte: semester.startDate,
        },
        OR: [
          {
            endDate: null,
          },
          {
            endDate: {
              gte: semester.endDate,
            },
          },
        ],
      },
      orderBy: {
        startDate: "desc",
      },
    });

  if (!historicalAssignment) {
    return {
      error:
        "You were not assigned to teach this subject for the selected semester.",
      teacher,
      teacherProfile,
      assignment: null,
      historicalAssignment: null,
      semester,
    };
  }

  const assignment = await prisma.teacherAssignment.findUnique({
    where: {
      sectionId_subjectId: {
        sectionId: classId,
        subjectId,
      },
    },
    include: {
      section: {
        select: {
          id: true,
          schoolYearId: true,
        },
      },
    },
  });

  return {
    error: null,
    teacher,
    teacherProfile,
    assignment,
    historicalAssignment,
    semester,
  };
}

async function validateSubjectSemesterTotal(
  subjectId: string,
  semesterId: string,
  replacementExamId: string | null,
  replacementMaxMarks: number
) {
  const exams = await prisma.exam.findMany({
    where: {
      subjectId,
      semesterId,
    },
    select: {
      id: true,
      name: true,
      maxMarks: true,
    },
  });

  const total =
    exams.reduce((sum, exam) => {
      if (exam.id === replacementExamId) {
        return sum;
      }

      return sum + Number(exam.maxMarks);
    }, 0) + replacementMaxMarks;

  return {
    total,
    valid: total <= 100,
  };
}


/*
 * CREATE ASSESSMENT
 */
export async function createAssessment(formData: FormData) {
  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { error: "Invalid assessment data." };
  }

  let parsedInput: unknown;

  try {
    parsedInput = JSON.parse(raw);
  } catch {
    return { error: "Invalid assessment data." };
  }

  const parsed = examSchema.safeParse(parsedInput);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Invalid assessment data.",
    };
  }

  const data = parsed.data;

  const access = await getTeacherAssignment(
    data.classId,
    data.subjectId
  );

  if (access.error || !access.assignment) {
    return { error: access.error ?? "Unauthorized." };
  }

  const semester = await prisma.semester.findFirst({
    where: {
      id: data.semesterId,
      schoolYearId: access.assignment.section.schoolYearId,
    },
  });

  if (!semester) {
    return {
      error:
        "The selected semester does not belong to this school year.",
    };
  }

  const lockCheck = await rejectLockedSemester(semester.id);
  if (lockCheck) {
    return lockCheck;
  }
  const existingName = await prisma.exam.findFirst({
  where: {
    semesterId: data.semesterId,
    subjectId: data.subjectId,
    name: {
      equals: data.name,
      mode: "insensitive",
    },
  },
});

  if (existingName) {
    return {
      error:
        "An assessment with this name already exists in this semester.",
    };
  }

 const totalCheck = await validateSubjectSemesterTotal(
  data.subjectId,
  data.semesterId,
  null,
  data.maxMarks
);

  if (!totalCheck.valid) {
    return {
      error:
        `Cannot create "${data.name}". The semester assessment maximum would be ${totalCheck.total}/100. ` +
        "Reduce this assessment or another assessment first.",
    };
  }

  await prisma.exam.create({
  data: {
    name: data.name,
    maxMarks: data.maxMarks,
    schoolYearId: access.assignment.section.schoolYearId,
    semesterId: data.semesterId,
    subjectId: data.subjectId,
  },
});

  await logAction(
    access.teacher.user.id,
    "ASSESSMENT_CREATED",
    "Section",
    data.classId,
    {
      subjectId: data.subjectId,
      semesterId: data.semesterId,
      name: data.name,
      maxMarks: data.maxMarks,
    }
  );

  revalidatePath(
    `/dashboard/teacher/results/${data.classId}/${data.subjectId}`
  );

  return { success: true };
}

/*
 * UPDATE ASSESSMENT
 */
export async function updateAssessment(formData: FormData) {
  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { error: "Invalid assessment data." };
  }

  let parsedInput: unknown;

  try {
    parsedInput = JSON.parse(raw);
  } catch {
    return { error: "Invalid assessment data." };
  }

  const parsed = examSchema.extend({
    examId: z.string().min(1),
  }).safeParse(parsedInput);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Invalid assessment data.",
    };
  }

  const data = parsed.data;

  const access = await getTeacherAssignment(
    data.classId,
    data.subjectId
  );

  if (access.error || !access.assignment) {
    return { error: access.error ?? "Unauthorized." };
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: data.examId,
      subjectId: data.subjectId,
      semesterId: data.semesterId,
      semester: {
        schoolYearId: access.assignment.section.schoolYearId,
      },
    },
  });

  if (!exam) {
    return {
      error: "Assessment not found or does not belong to this semester.",
    };
  }

  const lockCheck = await rejectLockedSemester(exam.semesterId);

  if (lockCheck) {
    return lockCheck;
  }

  const duplicate = await prisma.exam.findFirst({
    where: {
      semesterId: data.semesterId,
      id: {
        not: data.examId,
      },
      name: {
        equals: data.name,
        mode: "insensitive",
      },
    },
  });

  if (duplicate) {
    return {
      error:
        "Another assessment with this name already exists in this semester.",
    };
  }

  const totalCheck = await validateSubjectSemesterTotal(
  data.subjectId,
  data.semesterId,
  data.examId,
  data.maxMarks
);

  if (!totalCheck.valid) {
    return {
      error:
        `Cannot update "${data.name}". The semester assessment maximum would be ${totalCheck.total}/100. ` +
        "Reduce the marks before saving.",
    };
  }

  await prisma.exam.update({
    where: {
      id: data.examId,
    },
    data: {
      name: data.name,
      maxMarks: data.maxMarks,
      
    },
  });

  await logAction(
    access.teacher.user.id,
    "ASSESSMENT_UPDATED",
    "Section",
    data.classId,
    {
      subjectId: data.subjectId,
      semesterId: data.semesterId,
      examId: data.examId,
      name: data.name,
      maxMarks: data.maxMarks,
    }
  );

  revalidatePath(
    `/dashboard/teacher/results/${data.classId}/${data.subjectId}`
  );

  return { success: true };
}

/*
 * DELETE ASSESSMENT
 */
export async function deleteAssessment(formData: FormData) {
  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { error: "Invalid assessment data." };
  }

  let parsedInput: unknown;

  try {
    parsedInput = JSON.parse(raw);
  } catch {
    return { error: "Invalid assessment data." };
  }

  const parsed = examIdSchema.safeParse(parsedInput);

  if (!parsed.success) {
    return {
      error: "Invalid assessment data.",
    };
  }

  const data = parsed.data;

  const access = await getTeacherAssignment(
    data.classId,
    data.subjectId
  );

  if (access.error || !access.assignment) {
    return { error: access.error ?? "Unauthorized." };
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: data.examId,
      semester: {
        schoolYearId: access.assignment.section.schoolYearId,
      },
    },
  });

  if (!exam) {
    return {
      error: "Assessment not found.",
    };
  }

  const lockCheck = await rejectLockedSemester(exam.semesterId);

  if (lockCheck) {
    return lockCheck;
  }


  const resultCount = await prisma.result.count({
    where: {
      resultCard: {
        examId: data.examId,
      },
      subjectId: data.subjectId,
    },
  });

  if (resultCount > 0) {
    return {
      error:
        "This assessment already has student marks. Clear those marks before deleting the assessment.",
    };
  }

  await prisma.exam.delete({
    where: {
      id: data.examId,
    },
  });

  await logAction(
    access.teacher.user.id,
    "ASSESSMENT_DELETED",
    "Section",
    data.classId,
    {
      subjectId: data.subjectId,
      semesterId: exam.semesterId,
      examId: data.examId,
      name: exam.name,
      maxMarks: exam.maxMarks,
    }
  );

  revalidatePath(
    `/dashboard/teacher/results/${data.classId}/${data.subjectId}`
  );

  return { success: true };
}

/*
 * SAVE MARKS
 */
export async function submitSubjectMarks(formData: FormData) {
  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { error: "Invalid submission data." };
  }

  let parsedInput: unknown;

  try {
    parsedInput = JSON.parse(raw);
  } catch {
    return { error: "Invalid submission data." };
  }

  const parsed = marksSchema.safeParse(parsedInput);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Invalid submission.",
    };
  }

  const data = parsed.data;

  const access = await getTeacherAssignment(
    data.classId,
    data.subjectId
  );

  if (access.error || !access.assignment || !access.teacherProfile) {
    return { error: access.error ?? "Unauthorized." };
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: data.examId,
      subjectId: data.subjectId,
      semesterId: data.semesterId,
      semester: {
        schoolYearId: access.assignment.section.schoolYearId,
      },
    },
  });

  if (!exam) {
    return {
      error:
        "This assessment does not belong to the selected semester and school year.",
    };
  }

  const lockCheck = await rejectLockedSemester(exam.semesterId);

  if (lockCheck) {
    return lockCheck;
  }

  const examMaxMarks = Number(exam.maxMarks);

  if (
    data.entries.some(
      (entry) => Number(entry.maxMarks) !== examMaxMarks
    )
  ) {
    return {
      error:
        "The submitted maximum mark does not match the assessment configuration.",
    };
  }

  const studentIds = data.entries.map(
    (entry) => entry.studentId
  );

  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        sectionId: data.classId,
        status: "ACTIVE",
        studentId: {
          in: studentIds,
        },
      },
      select: {
        studentId: true,
      },
    });

  const validStudentIds = new Set(
    enrollments.map((item) => item.studentId)
  );

  for (const entry of data.entries) {
    if (!validStudentIds.has(entry.studentId)) {
      return {
        error: "One or more students are not enrolled in this section.",
      };
    }

    if (entry.marksObtained > examMaxMarks) {
      return {
        error:
          `A mark cannot exceed ${examMaxMarks} for ${exam.name}.`,
      };
    }

    const otherResults =
      await prisma.result.findMany({
        where: {
          subjectId: data.subjectId,
          resultCard: {
            studentId: entry.studentId,
            exam: {
              semesterId: data.semesterId,
              id: {
                not: data.examId,
              },
            },
          },
        },
        select: {
          marksObtained: true,
          maxMarks: true,
        },
      });

    const semesterObtained =
      otherResults.reduce(
        (sum, result) =>
          sum + Number(result.marksObtained),
        0
      ) + entry.marksObtained;

    if (semesterObtained > 100) {
      return {
        error:
          "Saving denied. A student's total marks for this subject would exceed 100 for the semester.",
      };
    }
  }

  function calculateGrade(
    marksObtained: number,
    maxMarks: number
  ) {
    const percentage =
      (marksObtained / maxMarks) * 100;

    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";

    return "F";
  }

  for (const entry of data.entries) {
    const card = await prisma.resultCard.upsert({
      where: {
        studentId_examId: {
          studentId: entry.studentId,
          examId: data.examId,
        },
      },
      update: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      create: {
        studentId: entry.studentId,
        examId: data.examId,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    await prisma.result.upsert({
      where: {
        resultCardId_subjectId: {
          resultCardId: card.id,
          subjectId: data.subjectId,
        },
      },
      update: {
        marksObtained: entry.marksObtained,
        maxMarks: examMaxMarks,
        grade: calculateGrade(
          entry.marksObtained,
          examMaxMarks
        ),
        enteredById: access.teacherProfile.id,
      },
      create: {
        resultCardId: card.id,
        subjectId: data.subjectId,
        marksObtained: entry.marksObtained,
        maxMarks: examMaxMarks,
        grade: calculateGrade(
          entry.marksObtained,
          examMaxMarks
        ),
        enteredById: access.teacherProfile.id,
      },
    });

    /*
     * Notify this student that their mark was saved.
     * Saving marks does NOT notify the homeroom teacher.
     */
    const savedSubject = await prisma.subject.findUnique({
      where: {
        id: data.subjectId,
      },
      select: {
        name: true,
      },
    });

    const studentUser = await prisma.student.findUnique({
      where: {
        id: entry.studentId,
      },
      select: {
        userId: true,
      },
    });

    if (studentUser?.userId) {
      await prisma.notification.create({
        data: {
          userId: studentUser.userId,
          channel: "IN_APP",
          status: "SENT",
          title: "Result updated",
          message:
            `Your ${savedSubject?.name ?? "subject"} mark for ${exam.name} has been saved.`,
          sectionId: data.classId,
        },
      });
    }
  }

  await logAction(
    access.teacher.user.id,
    "SUBJECT_MARKS_SAVED",
    "Section",
    data.classId,
    {
      subjectId: data.subjectId,
      examId: data.examId,
      semesterId: data.semesterId,
      studentCount: data.entries.length,
    }
  );

  revalidatePath(
    `/dashboard/teacher/results/${data.classId}/${data.subjectId}`
  );

  revalidatePath(
    `/dashboard/teacher/homeroom/${data.classId}/results`
  );

  revalidatePath("/dashboard/teacher/results");
  revalidatePath("/dashboard/student/results");
  revalidatePath("/dashboard/admin/results");
  revalidatePath("/dashboard/admin/results");

  return {
    success: true,
  };
}

/*
 * ---------------------------------------------------------
 * SEND SEMESTER SUBJECT RESULT TO HOMEROOM
 * ---------------------------------------------------------
 *
 * This sends the FINAL subject total for the semester
 * (out of 100) to the homeroom teacher.
 *
 * Individual assessments remain available to students.
 * The homeroom receives ONLY this final /100 result.
 */
export async function submitSemesterSubjectResult(formData: FormData) {
  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { error: "Invalid semester result data." };
  }

  let parsedInput: unknown;

  try {
    parsedInput = JSON.parse(raw);
  } catch {
    return { error: "Invalid semester result data." };
  }

  const parsed = z
    .object({
      classId: z.string().min(1),
      subjectId: z.string().min(1),
      semesterId: z.string().min(1),
    })
    .safeParse(parsedInput);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Invalid semester result data.",
    };
  }

  const data = parsed.data;

  const locked = await rejectLockedSemester(data.semesterId);

  if (locked) {
    return locked;
  }

  

  const access = await getTeacherSemesterAssignment(
    data.classId,
    data.subjectId,
    data.semesterId
  );

  if (
    access.error ||
    !access.historicalAssignment ||
    !access.teacherProfile
  ) {
    return {
      error: access.error ?? "Unauthorized.",
    };
  }


  const section = await prisma.section.findUnique({
    where: {
      id: data.classId,
    },
    select: {
      id: true,
      schoolYearId: true,
      homeroomTeacherId: true,
    },
  });

  if (!section) {
    return {
      error: "Section not found.",
    };
  }

  const semester = await prisma.semester.findFirst({
    where: {
      id: data.semesterId,
      schoolYearId: section.schoolYearId,
    },
  });

  if (!semester) {
    return {
      error:
        "The selected semester does not belong to this section's school year.",
    };
  }

  /*
   * Get every active student in this section.
   */
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      sectionId: section.id,
      status: "ACTIVE",
    },
    select: {
      studentId: true,
    },
  });

  if (enrollments.length === 0) {
    return {
      error: "There are no active students in this section.",
    };
  }

  const studentIds = enrollments.map(
    (enrollment) => enrollment.studentId
  );

  /*
   * The subject configuration itself MUST total exactly 100.
   *
   * Example:
   * First Quiz  10
   * Second Quiz 10
   * Midterm     30
   * Final       50
   * ----------------
   * Total       100
   */
  const exams = await prisma.exam.findMany({
    where: {
      subjectId: data.subjectId,
      semesterId: data.semesterId,
    },
    select: {
      id: true,
      name: true,
      maxMarks: true,
    },
  });

  const assessmentMaximum = exams.reduce(
    (sum, exam) => sum + Number(exam.maxMarks),
    0
  );

  if (assessmentMaximum !== 100) {
    return {
      error:
        `Cannot submit this subject yet. Assessment maximums total ${assessmentMaximum}/100. They must total exactly 100.`,
    };
  }

  /*
   * Get all published assessment results for this subject
   * and semester.
   *
   * IMPORTANT:
   * Only PUBLISHED results count toward the final semester
   * subject total sent to the homeroom.
   */
  const results = await prisma.result.findMany({
    where: {
      subjectId: data.subjectId,
      resultCard: {
        studentId: {
          in: studentIds,
        },
        status: "PUBLISHED",
        exam: {
          semesterId: data.semesterId,
        },
      },
    },
    select: {
      resultCard: {
        select: {
          studentId: true,
          examId: true,
        },
      },
      marksObtained: true,
      maxMarks: true,
    },
  });

  /*
   * Every student must have a published mark for EVERY
   * configured assessment before the subject can be sent
   * to the homeroom teacher.
   */
  const resultKeys = new Set(
    results.map(
      (result) =>
        `${result.resultCard.studentId}:${result.resultCard.examId}`
    )
  );

  for (const studentId of studentIds) {
    for (const exam of exams) {
      if (!resultKeys.has(`${studentId}:${exam.id}`)) {
        return {
          error:
            `Cannot submit this subject yet. One or more students are missing marks for "${exam.name}".`,
        };
      }
    }
  }

  /*
   * Calculate each student's FINAL semester subject mark
   * out of 100 from the published assessment marks.
   */
  const totals = new Map<string, number>();

  for (const result of results) {
    const studentId = result.resultCard.studentId;
    const previous = totals.get(studentId) ?? 0;

    totals.set(
      studentId,
      previous + Number(result.marksObtained)
    );
  }

  for (const studentId of studentIds) {
    const total = totals.get(studentId);

    if (total === undefined) {
      return {
        error:
          "Cannot submit this subject yet. One or more students do not have a complete semester result.",
      };
    }

    if (total > 100) {
      return {
        error:
          "Cannot submit. One or more students have a semester subject total above 100.",
      };
    }
  }

  /*
   * Create or update the single semester submission for:
   *
   * section + semester + subject
   *
   * This means the teacher can submit again later after
   * correcting/updating published assessment marks.
   */
  const submission = await prisma.semesterSubjectSubmission.upsert({
    where: {
      sectionId_semesterId_subjectId: {
        sectionId: data.classId,
        semesterId: data.semesterId,
        subjectId: data.subjectId,
      },
    },
    update: {
      teacherId: access.teacherProfile.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    },
    create: {
      sectionId: data.classId,
      semesterId: data.semesterId,
      subjectId: data.subjectId,
      teacherId: access.teacherProfile.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  /*
   * Replace the stored /100 student totals.
   *
   * This makes resubmission safe:
   * the homeroom always sees the teacher's latest
   * semester result.
   */
  await prisma.$transaction(async (tx) => {
    await tx.semesterSubjectResult.deleteMany({
      where: {
        submissionId: submission.id,
      },
    });

    await tx.semesterSubjectResult.createMany({
      data: studentIds.map((studentId) => ({
        submissionId: submission.id,
        studentId,
        marksObtained: totals.get(studentId) ?? 0,
        maxMarks: 100,
      })),
    });
  });

  /*
 * Notify the CURRENT homeroom teacher only.
 *
 * If the teacher was removed from this section, they will not
 * receive future notifications because the lookup is performed
 * against the section's CURRENT homeroom assignment.
 */
if (section.homeroomTeacherId) {
  const homeroomTeacher = await prisma.teacher.findUnique({
    where: {
      id: section.homeroomTeacherId,
      status: "ACTIVE",
      user: {
        isActive: true,
      },
    },
    select: {
      userId: true,
    },
  });

  if (homeroomTeacher) {
    const subject = await prisma.subject.findUnique({
      where: {
        id: data.subjectId,
      },
      select: {
        name: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: homeroomTeacher.userId,
        channel: "IN_APP",
        status: "SENT",
        sentAt: new Date(),
        title: "Semester result submitted",
        message:
          `${subject?.name ?? "A subject"} semester result has been submitted ` +
          `for review for ${semester.name}.`,
        sectionId: data.classId,
      },
    });
  }
}

await logAction(
    access.teacher.user.id,
    "SEMESTER_SUBJECT_RESULT_SUBMITTED",
    "SemesterSubjectSubmission",
    submission.id,
    {
      sectionId: data.classId,
      subjectId: data.subjectId,
      semesterId: data.semesterId,
      studentCount: studentIds.length,
    }
  );

  revalidatePath(
    `/dashboard/teacher/results/${data.classId}/${data.subjectId}`
  );

  revalidatePath(
    `/dashboard/teacher/homeroom/${data.classId}/results`
  );

  revalidatePath("/dashboard/teacher/results");
  revalidatePath("/dashboard/student/results");
  revalidatePath("/dashboard/admin/results");

  return {
    success: true,
    submissionId: submission.id,
  };
}


















