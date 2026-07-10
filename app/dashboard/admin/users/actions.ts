"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import {
  createTeacherSchema,
  createParentSchema,
  createClassSchema,
  createStudentSchema,
  editStudentSchema,
  editClassSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createTeacher(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = createTeacherSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { fullName, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      role: "TEACHER",
      teacherProfile: { create: { fullName } },
    },
  });

  await logAction(admin.id, "TEACHER_CREATED", "User", user.id, { email });
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function createParent(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = createParentSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { fullName, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      role: "PARENT",
      parentProfile: { create: { fullName } },
    },
  });

  await logAction(admin.id, "PARENT_CREATED", "User", user.id, { email });
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function createClass(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = createClassSchema.safeParse({
    name: formData.get("name"),
    grade: Number(formData.get("grade")),
    teacherId: formData.get("teacherId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
const existingClass = await prisma.class.findFirst({
    where: { name: parsed.data.name, grade: parsed.data.grade },
  });
  if (existingClass) {
    return { error: "A class with this name and grade already exists." };
  }
  const newClass = await prisma.class.create({ data: parsed.data });

  await logAction(admin.id, "CLASS_CREATED", "Class", newClass.id, {
    name: newClass.name,
  });
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function createStudent(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = createStudentSchema.safeParse({
    fullName: formData.get("fullName"),
    admissionNo: formData.get("admissionNo"),
    classId: formData.get("classId"),
    parentId: formData.get("parentId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { fullName, admissionNo, classId, parentId } = parsed.data;

  const existing = await prisma.student.findUnique({ where: { admissionNo } });
  if (existing) {
    return { error: "A student with this admission number already exists." };
  }

  const student = await prisma.student.create({
    data: {
      fullName,
      admissionNo,
      classId,
      parents: { create: { parentId } },
    },
  });

  await logAction(admin.id, "STUDENT_CREATED", "Student", student.id, {
    admissionNo,
  });
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function assignTeacherToClass(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;

  if (!classId) {
    return { error: "No class specified." };
  }

  const targetClass = await prisma.class.findUnique({ where: { id: classId } });
  if (!targetClass) {
    return { error: "Class not found." };
  }

  await prisma.class.update({
    where: { id: classId },
    // Empty string from the "Unassign" option means null — this lets an
    // admin deliberately remove a teacher from a class, not just add one
    data: { teacherId: teacherId || null },
  });

  await logAction(admin.id, "CLASS_TEACHER_ASSIGNED", "Class", classId, {
    teacherId: teacherId || null,
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}
export async function editStudent(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = editStudentSchema.safeParse({
    studentId: formData.get("studentId"),
    fullName: formData.get("fullName"),
    admissionNo: formData.get("admissionNo"),
    classId: formData.get("classId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { studentId, fullName, admissionNo, classId } = parsed.data;

  const duplicate = await prisma.student.findFirst({
    where: { admissionNo, NOT: { id: studentId } },
  });
  if (duplicate) {
    return { error: "Another student already has this admission number." };
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { fullName, admissionNo, classId },
  });

  await logAction(admin.id, "STUDENT_EDITED", "Student", studentId, { fullName, admissionNo });
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function editClass(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const parsed = editClassSchema.safeParse({
    classId: formData.get("classId"),
    name: formData.get("name"),
    grade: Number(formData.get("grade")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { classId, name, grade } = parsed.data;

  const duplicate = await prisma.class.findFirst({
    where: { name, grade, NOT: { id: classId } },
  });
  if (duplicate) {
    return { error: "A class with this name and grade already exists." };
  }

  await prisma.class.update({ where: { id: classId }, data: { name, grade } });

  await logAction(admin.id, "CLASS_EDITED", "Class", classId, { name, grade });
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const userId = formData.get("userId") as string;
  const isActive = formData.get("isActive") === "true";

  if (!userId) return { error: "No user specified." };

  // Prevent an admin from locking themselves out
  if (userId === admin.id && !isActive) {
    return { error: "You cannot deactivate your own account." };
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive } });

  await logAction(
    admin.id,
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

  const classId = formData.get("classId") as string;
  const subjectId = formData.get("subjectId") as string;
  const teacherId = formData.get("teacherId") as string;

  if (!classId || !subjectId) {
    return { error: "Class and subject are required." };
  }

  if (!teacherId) {
    // Empty selection means "unassign" — delete the row if it exists
    await prisma.classSubjectTeacher.deleteMany({ where: { classId, subjectId } });
    await logAction(admin.id, "SUBJECT_TEACHER_UNASSIGNED", "Class", classId, { subjectId });
    revalidatePath("/dashboard/admin/users");
    return { success: true };
  }

  await prisma.classSubjectTeacher.upsert({
    where: { classId_subjectId: { classId, subjectId } },
    update: { teacherId },
    create: { classId, subjectId, teacherId },
  });

  await logAction(admin.id, "SUBJECT_TEACHER_ASSIGNED", "Class", classId, {
    subjectId,
    teacherId,
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}