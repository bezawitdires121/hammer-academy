"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createGrade(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const levelRaw = formData.get("level");
  const sectionsCountRaw = formData.get("sectionsCount");
  const schoolYearId = String(formData.get("schoolYearId") || "");

  const level = Number(levelRaw);
  const sectionsCount = Number(sectionsCountRaw) || 0;

  if (!level || level <= 0) {
    return { error: "Invalid grade level." };
  }

  if (sectionsCount < 1 || sectionsCount > 26) {
    return { error: "Sections must be between 1 and 26." };
  }

  if (!schoolYearId) {
    return { error: "Please select a school year." };
  }

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
  });

  if (!schoolYear) {
    return { error: "School year not found." };
  }

  let grade = await prisma.grade.findUnique({
    where: { level },
  });

  if (!grade) {
    grade = await prisma.grade.create({
      data: { level },
    });
  }

  const created: string[] = [];

  for (let i = 0; i < sectionsCount; i++) {
    const label = String.fromCharCode(65 + i);

    const exists = await prisma.section.findUnique({
      where: {
        gradeId_label_schoolYearId: {
          gradeId: grade.id,
          label,
          schoolYearId,
        },
      },
    });

    if (!exists) {
      const section = await prisma.section.create({
        data: {
          gradeId: grade.id,
          schoolYearId,
          label,
        },
      });

      created.push(section.label);
    }
  }

  await logAction(
    admin.user.id,
    "GRADE_CREATED",
    "Grade",
    grade.id,
    {
      level,
      schoolYearId,
      sectionsCreated: created,
    }
  );

  revalidatePath("/dashboard/admin/grades");
  revalidatePath("/dashboard/admin/sections");

  return {
    success: true,
    gradeId: grade.id,
    created,
  };
}

export async function deleteGrade(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const gradeId = String(formData.get("gradeId") || "");

  if (!gradeId) {
    return { error: "Grade was not specified." };
  }

  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    include: {
      sections: {
        include: {
          _count: {
            select: {
              enrollments: true,
              subjectAssignments: true,
            },
          },
        },
      },
    },
  });

  if (!grade) {
    return { error: "Grade not found." };
  }

  const hasStudents = grade.sections.some(
    (section) => section._count.enrollments > 0
  );

  if (hasStudents) {
    return {
      error:
        "This grade cannot be deleted because one or more sections contain students.",
    };
  }

  const hasAssignments = grade.sections.some(
    (section) => section._count.subjectAssignments > 0
  );

  if (hasAssignments) {
    return {
      error:
        "This grade cannot be deleted because one or more sections have teacher assignments.",
    };
  }

  await prisma.grade.delete({
    where: { id: gradeId },
  });

  await logAction(
    admin.user.id,
    "GRADE_DELETED",
    "Grade",
    gradeId,
    {
      level: grade.level,
    }
  );

  revalidatePath("/dashboard/admin/grades");
  revalidatePath("/dashboard/admin/sections");

  return { success: true };
}