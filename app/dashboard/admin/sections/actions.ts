"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createSection(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const gradeId = String(formData.get("gradeId") || "");
  const schoolYearId = String(formData.get("schoolYearId") || "");
  const label = String(formData.get("label") || "")
    .trim()
    .toUpperCase();

  if (!gradeId || !schoolYearId || !label) {
    return { error: "Missing required fields." };
  }

  if (!/^[A-Z]$/.test(label)) {
    return { error: "Section label must be one letter from A to Z." };
  }

  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
  });

  if (!grade) {
    return { error: "Grade not found." };
  }

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
  });

  if (!schoolYear) {
    return { error: "School year not found." };
  }

  const existing = await prisma.section.findUnique({
    where: {
      gradeId_label_schoolYearId: {
        gradeId,
        label,
        schoolYearId,
      },
    },
  });

  if (existing) {
    return {
      error: `Section ${grade.level}${label} already exists for ${schoolYear.label} E.C.`,
    };
  }

  const section = await prisma.section.create({
    data: {
      gradeId,
      schoolYearId,
      label,
    },
  });

  await logAction(
    admin.user.id,
    "SECTION_CREATED",
    "Section",
    section.id,
    {
      gradeId,
      schoolYearId,
      label,
    }
  );

  revalidatePath("/dashboard/admin/grades");
  revalidatePath("/dashboard/admin/sections");

  return {
    success: true,
    sectionId: section.id,
  };
}

export async function editSection(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const sectionId = String(formData.get("sectionId") || "");
  const label = String(formData.get("label") || "")
    .trim()
    .toUpperCase();

  if (!sectionId || !label) {
    return { error: "Missing required fields." };
  }

  if (!/^[A-Z]$/.test(label)) {
    return { error: "Section label must be one letter from A to Z." };
  }

  const existingSection = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      grade: true,
      schoolYear: true,
    },
  });

  if (!existingSection) {
    return { error: "Section not found." };
  }

  const duplicate = await prisma.section.findUnique({
    where: {
      gradeId_label_schoolYearId: {
        gradeId: existingSection.gradeId,
        label,
        schoolYearId: existingSection.schoolYearId,
      },
    },
  });

  if (duplicate && duplicate.id !== sectionId) {
    return {
      error: `Section ${existingSection.grade.level}${label} already exists.`,
    };
  }

  const section = await prisma.section.update({
    where: { id: sectionId },
    data: { label },
  });

  await logAction(
    admin.user.id,
    "SECTION_EDITED",
    "Section",
    section.id,
    {
      oldLabel: existingSection.label,
      newLabel: label,
    }
  );

  revalidatePath("/dashboard/admin/grades");
  revalidatePath("/dashboard/admin/sections");

  return { success: true };
}

export async function deleteSection(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const sectionId = String(formData.get("sectionId") || "");

  if (!sectionId) {
    return { error: "Section was not specified." };
  }

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      grade: true,
      schoolYear: true,
      _count: {
        select: {
          enrollments: true,
          subjectAssignments: true,
          announcements: true,
          homework: true,
        },
      },
    },
  });

  if (!section) {
    return { error: "Section not found." };
  }

  if (section._count.enrollments > 0) {
    return {
      error:
        "This section cannot be deleted because students are enrolled in it.",
    };
  }

  if (section._count.subjectAssignments > 0) {
    return {
      error:
        "This section cannot be deleted because teachers are assigned to it.",
    };
  }

  if (section._count.announcements > 0 || section._count.homework > 0) {
    return {
      error:
        "This section cannot be deleted because it already contains school records.",
    };
  }

  await prisma.section.delete({
    where: { id: sectionId },
  });

  await logAction(
    admin.user.id,
    "SECTION_DELETED",
    "Section",
    sectionId,
    {
      gradeId: section.gradeId,
      schoolYearId: section.schoolYearId,
      label: section.label,
    }
  );

  revalidatePath("/dashboard/admin/grades");
  revalidatePath("/dashboard/admin/sections");

  return { success: true };
}