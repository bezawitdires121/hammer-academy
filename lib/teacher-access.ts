import { prisma } from "@/lib/prisma";

export async function getTeacherByUserId(userId: string) {
  return prisma.teacher.findUnique({
    where: { userId },
    select: {
      id: true,
      fullName: true,
      status: true,
    },
  });
}

/**
 * Returns true when the teacher currently has ANY relationship
 * with the section:
 *
 * - homeroom teacher
 * - subject teacher
 *
 * This is the main section-level authorization check.
 */
export async function teacherHasSectionAccess(
  teacherId: string,
  sectionId: string
) {
  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      OR: [
        {
          homeroomTeacherId: teacherId,
        },
        {
          subjectAssignments: {
            some: {
              teacherId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return !!section;
}

/**
 * Homeroom-only access.
 */
export async function teacherIsHomeroomTeacher(
  teacherId: string,
  sectionId: string
) {
  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      homeroomTeacherId: teacherId,
    },
    select: {
      id: true,
    },
  });

  return !!section;
}

/**
 * Subject-specific access.
 *
 * Example:
 * Teacher A may teach Math in 1A but Science in 1B.
 */
export async function teacherHasSubjectAccess(
  teacherId: string,
  sectionId: string,
  subjectId: string
) {
  const assignment = await prisma.teacherAssignment.findUnique({
    where: {
      sectionId_subjectId: {
        sectionId,
        subjectId,
      },
    },
    select: {
      teacherId: true,
    },
  });

  return assignment?.teacherId === teacherId;
}

/**
 * Return all sections the teacher CURRENTLY has access to.
 *
 * This deliberately does NOT look at old homework, attendance,
 * results, messages, etc.
 */
export async function getTeacherCurrentSectionIds(
  teacherId: string
) {
  const sections = await prisma.section.findMany({
    where: {
      OR: [
        {
          homeroomTeacherId: teacherId,
        },
        {
          subjectAssignments: {
            some: {
              teacherId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return sections.map((section) => section.id);
}

/**
 * Return the sections where this teacher currently teaches
 * a particular subject.
 */
export async function getTeacherSubjectSectionIds(
  teacherId: string,
  subjectId: string
) {
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId,
      subjectId,
    },
    select: {
      sectionId: true,
    },
  });

  return assignments.map((assignment) => assignment.sectionId);
}
