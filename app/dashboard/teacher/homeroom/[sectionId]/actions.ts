"use server";

import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createHomeroomAnnouncement(
  sectionId: string,
  formData: FormData
) {
  const session = await requireTeacher();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title) {
    return {
      success: false,
      error: "Announcement title is required.",
    };
  }

  if (!body) {
    return {
      success: false,
      error: "Announcement message is required.",
    };
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!teacher) {
    return {
      success: false,
      error: "Teacher account not found.",
    };
  }

  const section = await prisma.section.findUnique({
    where: {
      id: sectionId,
    },
  });

  if (!section) {
    return {
      success: false,
      error: "Section not found.",
    };
  }

  // Security check:
  // A teacher can only create announcements
  // for a section where they are the homeroom teacher.
  if (section.homeroomTeacherId !== teacher.id) {
    return {
      success: false,
      error: "You are not assigned to this homeroom section.",
    };
  }

  const currentSemester = await prisma.semester.findFirst({
    where: {
      schoolYearId: section.schoolYearId,
      isCurrent: true,
    },
    select: {
      id: true,
      isLocked: true,
    },
  });

  if (!currentSemester) {
    return {
      success: false,
      error: "No current semester is configured for this school year.",
    };
  }

  if (currentSemester.isLocked) {
    return {
      success: false,
      error: "This semester is locked. Announcements cannot be created.",
    };
  }
  await prisma.announcement.create({
    data: {
      title,
      body,
      scope: "SECTION",
      sectionId: section.id,
      schoolYearId: section.schoolYearId,
      semesterId: currentSemester.id,
      createdById: session.user.id,
    },
  });

  revalidatePath(
    `/dashboard/teacher/homeroom/${sectionId}`
  );

  return {
    success: true,
  };
}



