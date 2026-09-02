"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createSchoolYear(formData: FormData) {
  const admin = await requireAdmin();

  const label = String(formData.get("label") || "").trim();

  if (!label) {
    return { error: "School year is required." };
  }

  const existing = await prisma.schoolYear.findUnique({
    where: { label },
  });

  if (existing) {
    return { error: "This school year already exists." };
  }

  const semesterCount = Number(formData.get("semesterCount") || 0);

  if (!Number.isInteger(semesterCount) || semesterCount < 1) {
    return { error: "Add at least one semester." };
  }

  const semesters: {
    name: string;
    number: number;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (let i = 1; i <= semesterCount; i++) {
    const name = String(formData.get(`semester${i}Name`) || "").trim();
    const startDate = parseDate(formData.get(`semester${i}StartDate`));
    const endDate = parseDate(formData.get(`semester${i}EndDate`));

    if (!name) {
      return { error: `Semester ${i} name is required.` };
    }

    if (!startDate || !endDate) {
      return {
        error: `Please provide valid start and end dates for ${name}.`,
      };
    }

    if (endDate <= startDate) {
      return {
        error: `${name} end date must be after its start date.`,
      };
    }

    semesters.push({
      name,
      number: i,
      startDate,
      endDate,
    });
  }

  const yearStart = semesters[0].startDate;
  const yearEnd = semesters[semesters.length - 1].endDate;

  const year = await prisma.schoolYear.create({
    data: {
      label,
      startDate: yearStart,
      endDate: yearEnd,
      isCurrent: false,
      semesters: {
        create: semesters,
      },
    },
  });

  await logAction(
    admin.user.id,
    "SCHOOL_YEAR_CREATED",
    "SchoolYear",
    year.id,
    {
      label,
      semesterCount,
    }
  );

  revalidatePath("/dashboard/admin/school-years");

  return { success: true };
}

export async function updateSchoolYear(formData: FormData) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") || "").trim();
  const label = String(formData.get("label") || "").trim();

  if (!id || !label) {
    return { error: "Please complete all fields." };
  }

  const existing = await prisma.schoolYear.findFirst({
    where: {
      label,
      NOT: { id },
    },
  });

  if (existing) {
    return { error: "Another school year already uses this label." };
  }

  const semesterCount = Number(formData.get("semesterCount") || 0);

  if (!Number.isInteger(semesterCount) || semesterCount < 1) {
    return { error: "Add at least one semester." };
  }

  const semesters: {
    id: string;
    name: string;
    number: number;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (let i = 1; i <= semesterCount; i++) {
    const semesterId = String(
      formData.get(`semester${i}Id`) || "",
    ).trim();

    const name = String(
      formData.get(`semester${i}Name`) || "",
    ).trim();

    const startDate = parseDate(
      formData.get(`semester${i}StartDate`),
    );

    const endDate = parseDate(
      formData.get(`semester${i}EndDate`),
    );

    if (!name) {
      return {
        error: `Semester ${i} name is required.`,
      };
    }

    if (!startDate || !endDate) {
      return {
        error: `Please provide valid start and end dates for ${name}.`,
      };
    }

    if (endDate <= startDate) {
      return {
        error: `${name} end date must be after its start date.`,
      };
    }

    if (!semesterId) {
      return {
        error: `Semester ${i} is missing its database ID.`,
      };
    }

    semesters.push({
      id: semesterId,
      name,
      number: i,
      startDate,
      endDate,
    });
  }

  const yearStart = semesters[0].startDate;
  const yearEnd = semesters[semesters.length - 1].endDate;

  await prisma.$transaction(async (tx) => {
    await tx.schoolYear.update({
      where: { id },
      data: {
        label,
        startDate: yearStart,
        endDate: yearEnd,
      },
    });

    for (const semester of semesters) {
      await tx.semester.update({
        where: {
          id: semester.id,
        },
        data: {
          name: semester.name,
          number: semester.number,
          startDate: semester.startDate,
          endDate: semester.endDate,
        },
      });
    }
  });

  await logAction(
    admin.user.id,
    "SCHOOL_YEAR_UPDATED",
    "SchoolYear",
    id,
    {
      label,
      semesterCount,
      semesters: semesters.map((semester) => ({
        id: semester.id,
        name: semester.name,
        number: semester.number,
        startDate: semester.startDate.toISOString(),
        endDate: semester.endDate.toISOString(),
      })),
    },
  );

  revalidatePath("/dashboard/admin/school-years");

  return { success: true };
}
export async function toggleSemesterLock(formData: FormData) {
  const admin = await requireAdmin();

  const semesterId = String(formData.get("semesterId") || "").trim();

  if (!semesterId) {
    return { error: "Semester was not specified." };
  }

  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    include: {
      schoolYear: {
        select: {
          id: true,
          label: true,
        },
      },
    },
  });

  if (!semester) {
    return { error: "Semester not found." };
  }

  const newLockedState = !semester.isLocked;

  await prisma.semester.update({
    where: {
      id: semesterId,
    },
    data: {
      isLocked: newLockedState,
    },
  });

  await logAction(
    admin.user.id,
    newLockedState
      ? "SEMESTER_LOCKED"
      : "SEMESTER_UNLOCKED",
    "Semester",
    semesterId,
    {
      semesterName: semester.name,
      schoolYearId: semester.schoolYear.id,
      schoolYearLabel: semester.schoolYear.label,
      isLocked: newLockedState,
    }
  );

  revalidatePath("/dashboard/admin/school-years");

  return {
    success: true,
    isLocked: newLockedState,
  };
}
export async function setCurrentSchoolYear(formData: FormData) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") || "");

  if (!id) {
    return { error: "School year was not specified." };
  }

  const year = await prisma.schoolYear.findUnique({
    where: { id },
  });

  if (!year) {
    return { error: "School year not found." };
  }

  await prisma.$transaction([
    prisma.schoolYear.updateMany({
      data: { isCurrent: false },
    }),

    prisma.schoolYear.update({
      where: { id },
      data: { isCurrent: true },
    }),
  ]);

  await logAction(
    admin.user.id,
    "SCHOOL_YEAR_SET_CURRENT",
    "SchoolYear",
    id,
    { label: year.label }
  );

  revalidatePath("/dashboard/admin/school-years");

  return { success: true };
}

