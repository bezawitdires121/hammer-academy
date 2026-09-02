"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import {
  createTeacherSchema,
  createClassSchema,
  createStudentSchema,
  editStudentSchema,
  editClassSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { regenerateClassNumbers } from "@/lib/class-number";

export async function createTeacher(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = createTeacherSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { fullName, email, phone } = parsed.data;

  if (email) {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { error: "A user with this email already exists." };
    }
  }

  const makeId = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const teacherLoginId = `TCH-${makeId()}`;
  const passwordHash = await hashPassword(teacherLoginId);

  const user = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      role: "TEACHER",
      teacherProfile: {
        create: {
          fullName,
          teacherLoginId,
        },
      },
    },
  });

  await logAction(admin.user.id, "TEACHER_CREATED", "User", user.id, {
    email,
    teacherLoginId,
  });

  revalidatePath("/dashboard/admin/users");

  return { success: true, teacherLoginId };
}

export async function createClass(formData: FormData) {
  await requireRole(["ADMIN"]);

  return {
    error:
      "Class creation is removed; create Sections under School Years instead.",
  };
}

export async function createStudent(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const photo = formData.get("photo") as File | null;

  if (!photo || photo.size === 0) {
    return { error: "Please upload the student's photo." };
  }

  if (photo.size > 5 * 1024 * 1024) {
    return { error: "Student photo must be under 5MB." };
  }

  if (!photo.type.startsWith("image/")) {
    return { error: "Please upload a valid student image." };
  }

  const parsed = createStudentSchema.safeParse({
    fullName: formData.get("fullName"),
    sectionId: formData.get("sectionId"),
    gender: formData.get("gender"),
    age: formData.get("age"),
    dateOfBirth: formData.get("dateOfBirth"),
    parentFullName: formData.get("parentFullName"),
    parentPhone: formData.get("parentPhone"),
    parentRelationship: formData.get("parentRelationship"),
    parentEmail: formData.get("parentEmail") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    fullName,
    sectionId,
    gender,
    age,
    dateOfBirth,
    parentFullName,
    parentPhone,
    parentRelationship,
    parentEmail,
  } = parsed.data;

  const currentYear = await prisma.schoolYear.findFirst({
    where: { isCurrent: true },
  });

  if (!currentYear) {
    return { error: "No current school year configured." };
  }

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
  });

  if (!section) {
    return { error: "Selected section was not found." };
  }

  const blob = await put(`students/${Date.now()}-${photo.name}`, photo, {
    access: "public",
  });

  const makeId = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const studentLoginId = `STU-${makeId()}`;
  const passwordHash = await hashPassword(studentLoginId);

  const user = await prisma.user.create({
    data: {
      passwordHash,
      role: "STUDENT",
    },
  });

  const student = await prisma.student.create({
    data: {
      userId: user.id,
      fullName,
      studentLoginId,
      photoUrl: blob.url,
      gender,
      age,
      dateOfBirth,
      currentSectionId: sectionId,
    },
  });

  await prisma.studentEnrollment.create({
    data: {
      studentId: student.id,
      schoolYearId: currentYear.id,
      sectionId,
      status: "ACTIVE",
    },
  });

  // Regenerate Class Numbers for the section after adding this student.
  await regenerateClassNumbers(sectionId);

  await prisma.studentParentContact.create({
    data: {
      studentId: student.id,
      fullName: parentFullName,
      phone: parentPhone,
      email: parentEmail || null,
      relationship: parentRelationship,
    },
  });

  await logAction(admin.user.id, "STUDENT_CREATED", "Student", student.id, {
    studentLoginId,
    sectionId,
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/students");

  return { success: true, studentLoginId };
}

export async function assignTeacherToClass(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const sectionId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;

  if (!sectionId) {
    return { error: "No section specified." };
  }

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
  });

  if (!section) {
    return { error: "Section not found." };
  }

  await prisma.section.update({
    where: { id: sectionId },
    data: {
      homeroomTeacherId: teacherId || null,
    },
  });

  await logAction(admin.user.id, "HOMEROOM_ASSIGNED", "Section", sectionId, {
    teacherId: teacherId || null,
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/grades");
  revalidatePath("/dashboard/admin/sections");

  return { success: true };
}

export async function editStudent(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = editStudentSchema.safeParse({
    studentId: formData.get("studentId"),
    fullName: formData.get("fullName"),
    sectionId: formData.get("sectionId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { studentId, fullName, sectionId } = parsed.data;

  // Capture the old section before updating so we can regenerate its class numbers.
  const oldEnrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, status: "ACTIVE" },
    select: { sectionId: true },
  });
  const oldSectionId = oldEnrollment?.sectionId ?? null;

  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName,
      currentSectionId: sectionId,
    },
  });

  // If the section changed, update the enrollment row and regenerate both sections.
  if (sectionId && oldSectionId && oldSectionId !== sectionId) {
    await prisma.studentEnrollment.updateMany({
      where: { studentId, status: "ACTIVE" },
      data: { sectionId },
    });
    await regenerateClassNumbers(oldSectionId);
    await regenerateClassNumbers(sectionId);
  } else if (sectionId) {
    // Name may have changed — regenerate the current section.
    await regenerateClassNumbers(sectionId);
  }

  await logAction(admin.user.id, "STUDENT_EDITED", "Student", studentId, {
    fullName,
    sectionId,
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/students");
  revalidatePath(`/dashboard/admin/students/${studentId}`);

  return { success: true };
}

export async function editClass(formData: FormData) {
  await requireRole(["ADMIN"]);

  return {
    error: "Class editing removed. Use Section management instead.",
  };
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const userId = formData.get("userId") as string;
  const isActive = formData.get("isActive") === "true";

  if (!userId) {
    return { error: "No user specified." };
  }

  if (userId === admin.user.id && !isActive) {
    return {
      error: "You cannot deactivate your own account.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  await logAction(
    admin.user.id,
    isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    "User",
    userId,
    {}
  );

  revalidatePath("/dashboard/admin/users");

  return { success: true };
}

export async function assignSubjectTeacher(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const sectionId = formData.get("classId") as string;
  const subjectId = formData.get("subjectId") as string;
  const teacherId = formData.get("teacherId") as string;

  if (!sectionId || !subjectId) {
    return {
      error: "Section and subject are required.",
    };
  }

  if (!teacherId) {
    await prisma.teacherAssignment.deleteMany({
      where: { sectionId, subjectId },
    });

    await logAction(
      admin.user.id,
      "TEACHER_UNASSIGNED",
      "TeacherAssignment",
      sectionId,
      { subjectId }
    );

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin/grades");
    revalidatePath("/dashboard/admin/sections");

    return { success: true };
  }

  await prisma.teacherAssignment.upsert({
    where: { sectionId_subjectId: { sectionId, subjectId } },
    update: { teacherId },
    create: { sectionId, subjectId, teacherId },
  });

  await logAction(
    admin.user.id,
    "TEACHER_ASSIGNED",
    "TeacherAssignment",
    sectionId,
    { subjectId, teacherId }
  );

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/grades");
  revalidatePath("/dashboard/admin/sections");

  return { success: true };
}
