"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { notifyMultipleUsers } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function publishResult(resultId: string) {
  const admin = await requireRole(["ADMIN"]);

  const result = await prisma.result.findUnique({
    where: { id: resultId },
    include: {
      student: {
        include: { parents: { include: { parent: { include: { user: true } } } } },
      },
      subject: true,
      exam: true,
    },
  });

  if (!result) return { error: "Result not found." };
  if (result.status === "PUBLISHED") return { error: "Already published." };

  await prisma.result.update({
    where: { id: resultId },
    data: {
      status: "PUBLISHED",
      isLocked: true,
      publishedAt: new Date(),
    },
  });

  await logAction(admin.id, "RESULT_PUBLISHED", "Result", resultId, {
    studentId: result.studentId,
  });

  const parentUserIds = result.student.parents.map((ps) => ps.parent.user.id);
  await notifyMultipleUsers(
    parentUserIds,
    "New Result Published",
    `${result.student.fullName}'s ${result.subject.name} result for ${result.exam.name} has been published.`
  );

  revalidatePath("/dashboard/admin/results");
  return { success: true };
}

export async function unpublishResult(resultId: string) {
  const admin = await requireRole(["ADMIN"]);

  const result = await prisma.result.findUnique({ where: { id: resultId } });
  if (!result) return { error: "Result not found." };
  if (result.status !== "PUBLISHED") return { error: "Result is not published." };

  await prisma.result.update({
    where: { id: resultId },
    data: {
      status: "DRAFT",
      isLocked: false,
      publishedAt: null,
    },
  });

  await logAction(admin.id, "RESULT_UNPUBLISHED", "Result", resultId, {
    studentId: result.studentId,
  });

  revalidatePath("/dashboard/admin/results");
  return { success: true };
}