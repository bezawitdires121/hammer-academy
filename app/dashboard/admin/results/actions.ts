"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { notifyMultipleUsers } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function publishClassResults(classId: string, examId: string) {
  const admin = await requireRole(["ADMIN"]);

  const cards = await prisma.resultCard.findMany({
    where: {
      status: "DRAFT",
      examId,
      student: { classId },
    },
    include: {
      student: {
        include: { parents: { include: { parent: { include: { user: true } } } }, class: true },
      },
      exam: true,
    },
  });

  if (cards.length === 0) {
    return { error: "No draft results found for this class and result type." };
  }

  await prisma.resultCard.updateMany({
    where: { id: { in: cards.map((c) => c.id) } },
    data: { status: "PUBLISHED", isLocked: true, publishedAt: new Date() },
  });

  await logAction(admin.id, "CLASS_RESULTS_PUBLISHED", "Class", classId, {
    examId,
    studentCount: cards.length,
  });

  // Notify every affected parent once, not once per subject —
  // one clean SMS per child, matching the spec's "no grades in SMS" rule
  for (const card of cards) {
    const parentUserIds = card.student.parents.map((ps) => ps.parent.user.id);
    await notifyMultipleUsers(
      parentUserIds,
      "Results Published",
      `${card.student.fullName}'s ${card.exam.name} results have been published. You can see by logging into Hammer Academy: ${process.env.NEXT_PUBLIC_APP_URL}`
    );
  }

  revalidatePath("/dashboard/admin/results");
  return { success: true, count: cards.length };
}

export async function unpublishClassResults(classId: string, examId: string) {
  const admin = await requireRole(["ADMIN"]);

  const cards = await prisma.resultCard.findMany({
    where: { status: "PUBLISHED", examId, student: { classId } },
  });

  if (cards.length === 0) {
    return { error: "No published results found for this class and result type." };
  }

  await prisma.resultCard.updateMany({
    where: { id: { in: cards.map((c) => c.id) } },
    data: { status: "DRAFT", isLocked: false, publishedAt: null },
  });

  await logAction(admin.id, "CLASS_RESULTS_UNPUBLISHED", "Class", classId, {
    examId,
    studentCount: cards.length,
  });

  revalidatePath("/dashboard/admin/results");
  return { success: true, count: cards.length };
}