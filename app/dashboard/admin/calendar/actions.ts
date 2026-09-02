"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import {
  parseEthiopianDate,
} from "@/lib/ethiopian-calendar";
import { revalidatePath } from "next/cache";

function parseEcDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return parseEthiopianDate(value);
}

function eventType(value: string) {
  const allowed = [
    "PUBLIC_HOLIDAY",
    "SCHOOL_HOLIDAY",
    "TEACHER_TRAINING",
    "EXAM_DAY",
    "EMERGENCY_CLOSURE",
    "OTHER",
  ] as const;

  return allowed.includes(value as (typeof allowed)[number])
    ? (value as (typeof allowed)[number])
    : null;
}

export async function createCalendarEvent(
  formData: FormData,
) {
  const admin = await requireAdmin();

  const schoolYearId = String(
    formData.get("schoolYearId") || "",
  );

  const title = String(
    formData.get("title") || "",
  ).trim();

  const type = eventType(
    String(formData.get("type") || ""),
  );

  const startDate = parseEcDate(
    formData.get("startDate"),
  );

  const endDate = parseEcDate(
    formData.get("endDate"),
  );

  const note = String(
    formData.get("note") || "",
  ).trim();

  const isStudentClosed =
    formData.get("isStudentClosed") === "true";

  if (
    !schoolYearId ||
    !title ||
    !type ||
    !startDate ||
    !endDate
  ) {
    throw new Error(
      "Please complete all required fields.",
    );
  }

  if (endDate < startDate) {
    throw new Error(
      "End date cannot be before start date.",
    );
  }

  const schoolYear =
    await prisma.schoolYear.findUnique({
      where: { id: schoolYearId },
    });

  if (!schoolYear) {
    throw new Error("School year not found.");
  }

  const event =
    await prisma.schoolCalendarEvent.create({
      data: {
        schoolYearId,
        title,
        type,
        startDate,
        endDate,
        isStudentClosed,
        note: note || null,
      },
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

  await logAction(
    admin.user.id,
    "SCHOOL_CALENDAR_EVENT_CREATED",
    "SchoolCalendarEvent",
    event.id,
    { title, type },
  );

  revalidatePath(
    "/dashboard/admin/calendar",
  );

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    isStudentClosed: event.isStudentClosed,
    note: event.note,
    schoolYear: event.schoolYear,
  };
}

export async function updateCalendarEvent(
  formData: FormData,
) {
  const admin = await requireAdmin();

  const id = String(
    formData.get("id") || "",
  );

  const schoolYearId = String(
    formData.get("schoolYearId") || "",
  );

  const title = String(
    formData.get("title") || "",
  ).trim();

  const type = eventType(
    String(formData.get("type") || ""),
  );

  const startDate = parseEcDate(
    formData.get("startDate"),
  );

  const endDate = parseEcDate(
    formData.get("endDate"),
  );

  const note = String(
    formData.get("note") || "",
  ).trim();

  const isStudentClosed =
    formData.get("isStudentClosed") === "true";

  if (
    !id ||
    !schoolYearId ||
    !title ||
    !type ||
    !startDate ||
    !endDate
  ) {
    throw new Error(
      "Please complete all required fields.",
    );
  }

  if (endDate < startDate) {
    throw new Error(
      "End date cannot be before start date.",
    );
  }

  const existing =
    await prisma.schoolCalendarEvent.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new Error(
      "Calendar event not found.",
    );
  }

  const schoolYear =
    await prisma.schoolYear.findUnique({
      where: { id: schoolYearId },
    });

  if (!schoolYear) {
    throw new Error("School year not found.");
  }

  const event =
    await prisma.schoolCalendarEvent.update({
      where: { id },
      data: {
        schoolYearId,
        title,
        type,
        startDate,
        endDate,
        isStudentClosed,
        note: note || null,
      },
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

  await logAction(
    admin.user.id,
    "SCHOOL_CALENDAR_EVENT_UPDATED",
    "SchoolCalendarEvent",
    event.id,
    { title, type },
  );

  revalidatePath(
    "/dashboard/admin/calendar",
  );

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    isStudentClosed: event.isStudentClosed,
    note: event.note,
    schoolYear: event.schoolYear,
  };
}

export async function deleteCalendarEvent(
  formData: FormData,
) {
  const admin = await requireAdmin();

  const id = String(
    formData.get("id") || "",
  );

  if (!id) {
    throw new Error(
      "Event was not specified.",
    );
  }

  const event =
    await prisma.schoolCalendarEvent.findUnique({
      where: { id },
    });

  if (!event) {
    throw new Error(
      "Calendar event not found.",
    );
  }

  await prisma.schoolCalendarEvent.delete({
    where: { id },
  });

  await logAction(
    admin.user.id,
    "SCHOOL_CALENDAR_EVENT_DELETED",
    "SchoolCalendarEvent",
    id,
    { title: event.title },
  );

  revalidatePath(
    "/dashboard/admin/calendar",
  );
}