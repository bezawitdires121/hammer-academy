"use server";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { regenerateClassNumbers } from "@/lib/class-number";

function path(id: string) {
  return `/dashboard/admin/students/${id}`;
}

export async function addParentContact(studentId: string, formData: FormData) {
  await requireAdmin();
  const fullName = formData.get("fullName") as string;
  const relationship = formData.get("relationship") as string;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;

  if (!fullName?.trim() || !relationship?.trim())
    return { error: "Name and relationship are required." };

  await prisma.studentParentContact.create({
    data: {
      studentId,
      fullName: fullName.trim(),
      relationship: relationship.trim(),
      phone,
      email,
    },
  });

  revalidatePath(path(studentId));
  return { ok: true };
}

export async function removeParentContact(
  studentId: string,
  contactId: string
) {
  await requireAdmin();
  await prisma.studentParentContact.delete({ where: { id: contactId } });
  revalidatePath(path(studentId));
  return { ok: true };
}

export async function transferSection(studentId: string, formData: FormData) {
  await requireAdmin();
  const newSectionId = formData.get("sectionId") as string;
  const schoolYearId = formData.get("schoolYearId") as string;
  if (!newSectionId || !schoolYearId)
    return { error: "Section and school year are required." };

  // Capture old section before transfer so we can regenerate its class numbers.
  const oldEnrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_schoolYearId: { studentId, schoolYearId } },
    select: { sectionId: true },
  });
  const oldSectionId = oldEnrollment?.sectionId ?? null;

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_schoolYearId: { studentId, schoolYearId },
    },
    create: {
      studentId,
      schoolYearId,
      sectionId: newSectionId,
      status: "ACTIVE",
    },
    update: {
      sectionId: newSectionId,
      status: "ACTIVE",
    },
  });

  await prisma.student.update({
    where: { id: studentId },
    data: { currentSectionId: newSectionId },
  });

  // Regenerate class numbers for both affected sections.
  if (oldSectionId && oldSectionId !== newSectionId) {
    await regenerateClassNumbers(oldSectionId);
  }
  await regenerateClassNumbers(newSectionId);

  revalidatePath(path(studentId));
  return { ok: true };
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  studentId: string,
  status: string
) {
  await requireAdmin();
  await prisma.studentEnrollment.update({
    where: { id: enrollmentId },
    data: { status: status as never },
  });
  revalidatePath(path(studentId));
  return { ok: true };
}
