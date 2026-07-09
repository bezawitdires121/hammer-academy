"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { submitResultCardSchema } from "@/lib/validations";
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

export async function submitResultCard(formData: FormData) {
  const teacher = await requireRole(["TEACHER"]);

  const raw = formData.get("payload") as string;
  let parsedInput;
  try {
    parsedInput = JSON.parse(raw);
  } catch {
    return { error: "Invalid submission data." };
  }

  const parsed = submitResultCardSchema.safeParse(parsedInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { studentId, examId, remarks, subjectMarks } = parsed.data;

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: teacher.id },
  });
  if (!teacherProfile) return { error: "Teacher profile not found." };

  // Security: confirm this teacher actually owns the class this student is in
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student || student.class.teacherId !== teacherProfile.id) {
    return { error: "You do not have permission to enter results for this student." };
  }

  const existingCard = await prisma.resultCard.findUnique({
    where: { studentId_examId: { studentId, examId } },
  });

  if (existingCard?.isLocked) {
    return { error: "This report card is already published and locked. Contact admin to unpublish first." };
  }

  const resultCard = await prisma.resultCard.upsert({
    where: { studentId_examId: { studentId, examId } },
    update: { remarks, status: "DRAFT" },
    create: { studentId, examId, remarks, status: "DRAFT" },
  });

  // Replace all subject marks for this card in one clean transaction —
  // simpler and safer than trying to diff individual subject updates
  await prisma.$transaction([
    prisma.result.deleteMany({ where: { resultCardId: resultCard.id } }),
    prisma.result.createMany({
      data: subjectMarks.map((sm) => ({
        resultCardId: resultCard.id,
        subjectId: sm.subjectId,
        marksObtained: sm.marksObtained,
        maxMarks: sm.maxMarks,
        grade: calculateGrade(sm.marksObtained, sm.maxMarks),
        enteredById: teacherProfile.id,
      })),
    }),
  ]);

  await logAction(teacher.id, existingCard ? "RESULT_CARD_UPDATED" : "RESULT_CARD_CREATED", "ResultCard", resultCard.id, {
    studentId,
    examId,
  });

  revalidatePath(`/dashboard/teacher/results`);
  return { success: true };
}