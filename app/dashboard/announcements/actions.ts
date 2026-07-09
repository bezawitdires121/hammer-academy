"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { createAnnouncementSchema } from "@/lib/validations";
import { logAction } from "@/lib/audit";
import { notifyMultipleUsers } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  const user = await requireRole(["ADMIN", "TEACHER"]);

  const scope = formData.get("scope") as string;

  const parsed = createAnnouncementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    scope,
    classId: scope === "CLASS" ? formData.get("classId") || undefined : undefined,
    grade: scope === "GRADE" ? Number(formData.get("grade")) : undefined,
    priority: formData.get("priority") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const announcement = await prisma.announcement.create({
    data: {
      ...parsed.data,
      createdById: user.id,
    },
  });

  await logAction(user.id, "ANNOUNCEMENT_CREATED", "Announcement", announcement.id, {
    title: announcement.title,
    scope: announcement.scope,
  });

  // Figure out which parents are actually affected by this announcement's
  // scope, then notify only them — not every parent in the system
  let affectedParentUserIds: string[] = [];

  if (parsed.data.scope === "SCHOOL_WIDE") {
    const allParents = await prisma.parent.findMany({ include: { user: true } });
    affectedParentUserIds = allParents.map((p) => p.user.id);
  } else if (parsed.data.scope === "GRADE") {
    const parents = await prisma.parent.findMany({
      where: { students: { some: { student: { class: { grade: parsed.data.grade } } } } },
      include: { user: true },
    });
    affectedParentUserIds = parents.map((p) => p.user.id);
  } else if (parsed.data.scope === "CLASS") {
    const parents = await prisma.parent.findMany({
      where: { students: { some: { student: { classId: parsed.data.classId } } } },
      include: { user: true },
    });
    affectedParentUserIds = parents.map((p) => p.user.id);
  }

  await notifyMultipleUsers(
    affectedParentUserIds,
    announcement.title,
    announcement.body,
    announcement.id
  );

  revalidatePath("/dashboard/announcements");
  return { success: true };
}