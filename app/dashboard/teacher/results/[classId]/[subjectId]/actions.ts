"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const submitSubjectMarksSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  examId: z.string().min(1),
  entries: z.array(
    z.object({
      studentId: z.string().min(1),
      marksObtained: z.number().min(0),
      maxMarks: z.number().min(1),
    })
  ),
});

function calculateGrade(marksObtained: number, maxMarks: number): string {
  const percentage = (marksObtained / maxMarks) * 100;
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

export async function submitSubjectMarks(formData: FormData) {
  const teacher = await requireRole(["TEACHER"]);

  const raw = formData.get("payload") as string;
  let parsedInput;
  try {
    parsedInput = JSON.parse(raw);
  } catch {
    return { error: "Invalid submission data." };
  }

  const parsed = submitSubjectMarksSchema.safeParse(parsedInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { classId, subjectId, examId, entries } = parsed.data;

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: teacher.id },
  });
  if (!teacherProfile) return { error: "Teacher profile not found." };

  // Security: this teacher must actually be assigned to this class+subject
  const assignment = await prisma.classSubjectTeacher.findUnique({
    where: { classId_subjectId: { classId, subjectId } },
  });
  if (!assignment || assignment.teacherId !== teacherProfile.id) {
    return { error: "You are not assigned to teach this subject for this class." };
  }

  let skippedLocked = 0;

  for (const entry of entries) {
    if (entry.marksObtained === undefined || Number.isNaN(entry.marksObtained)) continue;

    const card = await prisma.resultCard.upsert({
      where: { studentId_examId: { studentId: entry.studentId, examId } },
      update: {},
      create: { studentId: entry.studentId, examId, status: "DRAFT" },
    });

    if (card.isLocked) {
      skippedLocked++;
      continue;
    }

    await prisma.result.upsert({
      where: { resultCardId_subjectId: { resultCardId: card.id, subjectId } },
      update: {
        marksObtained: entry.marksObtained,
        maxMarks: entry.maxMarks,
        grade: calculateGrade(entry.marksObtained, entry.maxMarks),
        enteredById: teacherProfile.id,
      },
      create: {
        resultCardId: card.id,
        subjectId,
        marksObtained: entry.marksObtained,
        maxMarks: entry.maxMarks,
        grade: calculateGrade(entry.marksObtained, entry.maxMarks),
        enteredById: teacherProfile.id,
      },
    });
  }

  await logAction(teacher.id, "SUBJECT_MARKS_SUBMITTED", "Class", classId, {
    subjectId,
    examId,
    studentCount: entries.length,
  });

  revalidatePath("/dashboard/teacher/results");

  if (skippedLocked > 0) {
    return {
      success: true,
      warning: `${skippedLocked} student(s) already have published results for this exam and were skipped. Contact admin to unpublish first.`,
    };
  }

  return { success: true };
}