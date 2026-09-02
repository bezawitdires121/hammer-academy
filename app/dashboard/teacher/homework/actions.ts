"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HomeworkSource } from "@prisma/client";
import { revalidatePath } from "next/cache";

type HomeworkInput = {
  title: string;
  instructions?: string;
  source: HomeworkSource;
  textbookName?: string;
  pageNumber?: string;
  exercises?: string;
  sourceNote?: string;
  assignedDate: string;
  dueDate?: string;
  sectionId: string;
  subjectId: string;
  semesterId: string | null;
};

async function getTeacher() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return null;
  }

  return prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });
}

/**
 * Verify that this teacher teaches this exact
 * subject in this exact section.
 */
async function getTeacherAssignment(
  teacherId: string,
  sectionId: string,
  subjectId: string
) {
  return prisma.teacherAssignment.findFirst({
    where: {
      teacherId,
      sectionId,
      subjectId,
    },
    include: {
      subject: true,
      section: {
        include: {
          grade: true,
          schoolYear: true,
        },
      },
    },
  });
}

/**
 * Verify that the selected semester belongs to
 * the SAME school year as the selected section.
 *
 * This is the important protection against:
 * Section from School Year A + Semester from School Year B
 * or accidental Semester 1 / Semester 2 mixing.
 */
async function getValidSemester(
  semesterId: string,
  schoolYearId: string
) {
  if (!semesterId) {
    return null;
  }

  return prisma.semester.findFirst({
    where: {
      id: semesterId,
      schoolYearId,
    },
  });
}

/**
 * Validate and prepare homework dates.
 */
function parseDates(
  assignedDateValue: string,
  dueDateValue: string | undefined,
  semesterStartDate: Date,
  semesterEndDate: Date
) {
  if (!assignedDateValue) {
    return {
      error: "Assigned date is required.",
    } as const;
  }

  const assignedDate = new Date(assignedDateValue);

  if (Number.isNaN(assignedDate.getTime())) {
    return {
      error: "Invalid assigned date.",
    } as const;
  }

  if (
    assignedDate < semesterStartDate ||
    assignedDate > semesterEndDate
  ) {
    return {
      error:
        "Assigned date must be within the selected semester.",
    } as const;
  }

  let dueDate: Date | null = null;

  if (dueDateValue) {
    dueDate = new Date(dueDateValue);

    if (Number.isNaN(dueDate.getTime())) {
      return {
        error: "Invalid due date.",
      } as const;
    }

    if (
      dueDate < semesterStartDate ||
      dueDate > semesterEndDate
    ) {
      return {
        error:
          "Due date must be within the selected semester.",
      } as const;
    }

    if (dueDate < assignedDate) {
      return {
        error:
          "Due date cannot be before the assigned date.",
      } as const;
    }
  }

  return {
    assignedDate,
    dueDate,
  } as const;
}

function validateSource(input: HomeworkInput) {
  if (
    input.source === "TEXTBOOK" &&
    !input.textbookName?.trim()
  ) {
    return "Textbook name is required for textbook homework.";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* STUDENT HOMEWORK NOTIFICATIONS                                             */
/* -------------------------------------------------------------------------- */

/**
 * Notify only students who are actively enrolled in the exact section.
 *
 * The StudentEnrollment record is the authoritative school-year/section
 * relationship. The student's User record supplies the notification target.
 *
 * Notifications are IN_APP only. No SMS/email is sent here.
 */
async function notifyStudentsAboutHomework({
  sectionId,
  schoolYearId,
  subjectName,
  homeworkTitle,
  action,
}: {
  sectionId: string;
  schoolYearId: string;
  subjectName: string;
  homeworkTitle: string;
  action: "CREATED" | "UPDATED";
}) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      sectionId,
      schoolYearId,
      status: "ACTIVE",
    },
    select: {
      student: {
        select: {
          userId: true,
        },
      },
    },
  });

  const userIds = [
    ...new Set(
      enrollments
        .map((enrollment) => enrollment.student.userId)
        .filter(Boolean)
    ),
  ];

  if (userIds.length === 0) {
    return;
  }

  const title =
    action === "CREATED"
      ? "New homework assigned"
      : "Homework updated";

  const message =
    action === "CREATED"
      ? `${subjectName}: "${homeworkTitle}" has been assigned.`
      : `${subjectName}: "${homeworkTitle}" has been updated.`;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      channel: "IN_APP",
      status: "SENT",
      sentAt: new Date(),

      /*
       * IMPORTANT:
       * Store the exact section on the notification.
       *
       * The dashboard bell uses section-aware notification
       * filtering, so homework notifications must carry the
       * section that received the homework.
       */
      sectionId,

      title,
      message,
    })),
  });
  /*
   * IMPORTANT:
   * The notification bell/count is rendered from the
   * dashboard tree/layout. Revalidate the dashboard
   * layout so the new unread notification appears in
   * the bell immediately after homework is created or
   * updated.
   */
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/notifications");
}

/* -------------------------------------------------------------------------- */
/* CREATE                                                                     */
/* -------------------------------------------------------------------------- */

export async function createHomework(
  input: HomeworkInput
) {
  const teacher = await getTeacher();

  if (!teacher) {
    return {
      error: "Teacher profile not found.",
    };
  }

  const title = input.title.trim();

  if (!title) {
    return {
      error: "Homework title is required.",
    };
  }

  if (!input.sectionId) {
    return {
      error: "Please select a class section.",
    };
  }

  if (!input.subjectId) {
    return {
      error: "Please select a subject.",
    };
  }

  if (!input.semesterId) {
    return {
      error: "Please select a semester.",
    };
  }

  /*
   * Verify the exact teacher + section + subject
   * combination.
   */
  const assignment = await getTeacherAssignment(
    teacher.id,
    input.sectionId,
    input.subjectId
  );

  if (!assignment) {
    return {
      error:
        "You are not assigned to teach this subject in this section.",
    };
  }

  /*
   * IMPORTANT:
   * The semester MUST belong to the same school year
   * as the selected section.
   */
  const semester = await getValidSemester(
    input.semesterId,
    assignment.section.schoolYearId
  );

  if (!semester) {
    return {
      error:
        "The selected semester does not belong to this section's school year.",
    };
  }

  if (semester.isLocked) {
    return {
      error: "This semester is locked. Homework cannot be changed.",
    };
  }

  const sourceError = validateSource(input);

  if (sourceError) {
    return {
      error: sourceError,
    };
  }

  const dates = parseDates(
    input.assignedDate,
    input.dueDate,
    semester.startDate,
    semester.endDate
  );

  if ("error" in dates) {
    return dates;
  }

  try {
    const homework = await prisma.homework.create({
      data: {
      semesterId: semester.id,
        title,

        instructions:
          input.instructions?.trim() || null,

        source: input.source,

        textbookName:
          input.source === "TEXTBOOK"
            ? input.textbookName?.trim() || null
            : null,

        pageNumber:
          input.source === "TEXTBOOK"
            ? input.pageNumber?.trim() || null
            : null,

        exercises:
          input.source === "TEXTBOOK"
            ? input.exercises?.trim() || null
            : null,

        sourceNote:
          input.sourceNote?.trim() || null,

        assignedDate: dates.assignedDate,
        dueDate: dates.dueDate,

        teacherId: teacher.id,

        /*
         * These come from the verified assignment.
         */
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,

        /*
         * This semester has already been verified to
         * belong to this section's school year.
         */
      },
    });

    /* Notify students in this exact section about the new homework. */
    const notificationContext = await prisma.section.findUnique({
      where: {
        id: assignment.sectionId,
      },
      select: {
        schoolYearId: true,
      },
    });

    const notificationSubject = await prisma.subject.findUnique({
      where: {
        id: assignment.subjectId,
      },
      select: {
        name: true,
      },
    });

    if (notificationContext && notificationSubject) {
      await notifyStudentsAboutHomework({
        sectionId: assignment.sectionId,
        schoolYearId: notificationContext.schoolYearId,
        subjectName: notificationSubject.name,
        homeworkTitle: title,
        action: "CREATED",
      });
    }

    revalidatePath(
      "/dashboard/teacher/homework"
    );

    revalidatePath(
      `/dashboard/teacher/homework/${assignment.sectionId}`
    );

    return {
      success: true,
      homeworkId: homework.id,
    };
  } catch (error) {
    console.error(
      "createHomework error:",
      error
    );

    return {
      error:
        "Failed to create homework. Please try again.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateHomework(
  homeworkId: string,
  input: HomeworkInput
) {
  const teacher = await getTeacher();

  if (!teacher) {
    return {
      error: "Teacher profile not found.",
    };
  }

  if (!homeworkId) {
    return {
      error: "Homework ID is required.",
    };
  }

  const title = input.title.trim();

  if (!title) {
    return {
      error: "Homework title is required.",
    };
  }

  if (!input.sectionId) {
    return {
      error: "Please select a class section.",
    };
  }

  if (!input.subjectId) {
    return {
      error: "Please select a subject.",
    };
  }

  if (!input.semesterId) {
    return {
      error: "Please select a semester.",
    };
  }

  /*
   * First verify that the homework exists and
   * belongs to this teacher.
   */
  const existingHomework =
    await prisma.homework.findUnique({
      where: {
        id: homeworkId,
      },
    });

  if (!existingHomework) {
    return {
      error: "Homework not found.",
    };
  }

  if (existingHomework.teacherId !== teacher.id) {
    return {
      error:
        "You are not authorized to edit this homework.",
    };
  }

  /*
   * Verify the NEW section + subject combination
   * belongs to this teacher.
   */
  const assignment = await getTeacherAssignment(
    teacher.id,
    input.sectionId,
    input.subjectId
  );

  if (!assignment) {
    return {
      error:
        "You are not assigned to teach this subject in this section.",
    };
  }

  /*
   * IMPORTANT:
   * The selected semester MUST belong to the
   * school year of the selected section.
   */
  const semester = await getValidSemester(
    input.semesterId,
    assignment.section.schoolYearId
  );

  if (!semester) {
    return {
      error:
        "The selected semester does not belong to this section's school year.",
    };
  }

  if (semester.isLocked) {
    return {
      error: "This semester is locked. Homework cannot be changed.",
    };
  }

  const sourceError = validateSource(input);

  if (sourceError) {
    return {
      error: sourceError,
    };
  }

  const dates = parseDates(
    input.assignedDate,
    input.dueDate,
    semester.startDate,
    semester.endDate
  );

  if ("error" in dates) {
    return dates;
  }

  try {
    await prisma.homework.update({
      where: {
        id: homeworkId,
      },

      data: {
        semesterId: semester.id,

        title,

        instructions:
          input.instructions?.trim() || null,

        source: input.source,

        textbookName:
          input.source === "TEXTBOOK"
            ? input.textbookName?.trim() || null
            : null,

        pageNumber:
          input.source === "TEXTBOOK"
            ? input.pageNumber?.trim() || null
            : null,

        exercises:
          input.source === "TEXTBOOK"
            ? input.exercises?.trim() || null
            : null,

        sourceNote:
          input.sourceNote?.trim() || null,

        assignedDate: dates.assignedDate,
        dueDate: dates.dueDate,

        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,

        /*
         * Never trust a semesterId by itself.
         * It was verified against the section school year above.
         */
      },
    });

        await notifyStudentsAboutHomework({
      sectionId: assignment.sectionId,
      schoolYearId: assignment.section.schoolYearId,
      subjectName: assignment.subject.name,
      homeworkTitle: title,
      action: "UPDATED",
    });
revalidatePath(
      "/dashboard/teacher/homework"
    );

    revalidatePath(
      `/dashboard/teacher/homework/${existingHomework.sectionId}`
    );

    revalidatePath(
      `/dashboard/teacher/homework/${assignment.sectionId}`
    );

    revalidatePath(
      `/dashboard/teacher/homework/item/${homeworkId}`
    );

    return {
      success: true,
      homeworkId,
    };
  } catch (error) {
    console.error(
      "updateHomework error:",
      error
    );

    return {
      error:
        "Failed to update homework. Please try again.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function deleteHomework(
  homeworkId: string
) {
  const teacher = await getTeacher();

  if (!teacher) {
    return {
      error: "Teacher profile not found.",
    };
  }

  if (!homeworkId) {
    return {
      error: "Homework ID is required.",
    };
  }

  const homework =
    await prisma.homework.findUnique({
      where: {
        id: homeworkId,
      },
    });

  if (!homework) {
    return {
      error: "Homework not found.",
    };
  }

  if (homework.teacherId !== teacher.id) {
    return {
      error:
        "You are not authorized to delete this homework.",
    };
  }


  if (homework.semesterId) {
    const semester = await prisma.semester.findUnique({
      where: {
        id: homework.semesterId,
      },
      select: {
        isLocked: true,
      },
    });

    if (semester?.isLocked) {
      return {
        error: "This semester is locked. Homework cannot be changed.",
      };
    }
  }

  try {
    await prisma.homework.delete({
      where: {
        id: homeworkId,
      },
    });

    revalidatePath(
      "/dashboard/teacher/homework"
    );

    revalidatePath(
      `/dashboard/teacher/homework/${homework.sectionId}`
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "deleteHomework error:",
      error
    );

    return {
      error:
        "Failed to delete homework. Please try again.",
    };
  }
}















