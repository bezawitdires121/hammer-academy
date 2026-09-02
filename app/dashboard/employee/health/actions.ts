"use server";

import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const PATH = "/dashboard/employee/health";

export async function recordVisit(formData: FormData) {
  const session = await auth();
  await requireRole(["HEALTH", "ADMIN"]);
  if (!session?.user?.id) return { error: "Not authenticated." };

  const studentId = formData.get("studentId") as string;
  const reason = (formData.get("reason") as string) || null;
  const symptoms = (formData.get("symptoms") as string) || null;
  const treatment = (formData.get("treatment") as string) || null;
  const medication = (formData.get("medication") as string) || null;
  const referral = (formData.get("referral") as string) || null;
  const outcome = (formData.get("outcome") as string) || "OTHER";
  const notes = (formData.get("notes") as string) || null;
  const followUpStr = formData.get("followUpAt") as string;
  const followUpAt = followUpStr ? new Date(followUpStr) : null;

  if (!studentId) return { error: "Student is required." };

  await prisma.healthVisit.create({
    data: {
      studentId,
      recordedById: session.user.id,
      reason,
      symptoms,
      treatment,
      medication,
      referral,
      outcome: outcome as never,
      notes,
      followUpAt,
    },
  });

  revalidatePath(`${PATH}/visits`);
  revalidatePath(`${PATH}/students`);
  return { ok: true };
}

export async function addCondition(studentId: string, name: string, details?: string) {
  await requireRole(["HEALTH", "ADMIN"]);
  if (!name.trim()) return { error: "Condition name is required." };

  await prisma.healthCondition.create({
    data: { studentId, name: name.trim(), details: details || null },
  });

  revalidatePath(`${PATH}/students`);
  return { ok: true };
}

export async function removeCondition(conditionId: string) {
  await requireRole(["HEALTH", "ADMIN"]);
  await prisma.healthCondition.delete({ where: { id: conditionId } });
  revalidatePath(`${PATH}/students`);
  return { ok: true };
}

