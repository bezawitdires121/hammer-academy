"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { createResultSchema } from "@/lib/validations";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

function calculateGrade(marksObtained: number, maxMarks: number): string {
  const percentage = (marksObtained / maxMarks) * 100;
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

export async function createResult(formData: FormData) {
  const teacher = await requireRole(["TEACHER"]);

  const parsed = createResultSchema.safeParse({
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    examId: formData.get("examId"),
    marksObtained: Number(formData.get("marksObtained")),
    maxMarks: Number(formData.get("maxMarks")) || 100,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { studentId, subjectId, examId, marksObtained, maxMarks } = parsed.data;

  if (marksObtained > maxMarks) {
    return { error: "Marks obtained cannot exceed max marks." };
  }

  // Find this teacher's own DB id (not the User id) since results are
  // attributed to the Teacher profile, not the raw user
  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: teacher.id },
  });
  if (!teacherProfile) {
    return { error: "Teacher profile not found." };
  }

  const existing = await prisma.result.findUnique({
    where: {
      studentId_subjectId_examId: { studentId, subjectId, examId },
    },
  });

  if (existing?.isLocked) {
    return { error: "This result is already published and locked. Contact admin to unpublish first." };
  }

  const grade = calculateGrade(marksObtained, maxMarks);

  const result = existing
    ? await prisma.result.update({
        where: { id: existing.id },
        data: { marksObtained, maxMarks, grade, enteredById: teacherProfile.id },
      })
    : await prisma.result.create({
        data: {
          studentId,
          subjectId,
          examId,
          marksObtained,
          maxMarks,
          grade,
          enteredById: teacherProfile.id,
          status: "DRAFT",
        },
      });

  await logAction(teacher.id, existing ? "RESULT_UPDATED" : "RESULT_CREATED", "Result", result.id, {
    studentId,
    marksObtained,
  });

  revalidatePath("/dashboard/teacher/results");
  return { success: true };
}