"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

export async function updateTeacherProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return { error: "You are not allowed to do this." };
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const photo = formData.get("photo");

  if (fullName.length < 2) {
    return { error: "Enter your full name." };
  }

  if (fullName.length > 100) {
    return { error: "Name is too long." };
  }

  if (phone && (phone.length < 9 || phone.length > 15)) {
    return { error: "Enter a valid phone number." };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  });

  if (!teacher) {
    return { error: "Teacher profile not found." };
  }

  let photoUrl = teacher.photoUrl;

  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) {
      return { error: "Photo must be an image." };
    }

    if (photo.size > 5 * 1024 * 1024) {
      return { error: "Photo must be under 5MB." };
    }

    const blob = await put(
      `teacher-profiles/${teacher.id}-${Date.now()}-${photo.name}`,
      photo,
      {
        access: "public",
      }
    );

    photoUrl = blob.url;
  }

  try {
    await prisma.$transaction([
      prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          fullName,
          photoUrl,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          phone: phone || null,
        },
      }),
    ]);
  } catch {
    return { error: "Could not save your profile." };
  }

  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/teacher/profile");

  return { success: true };
}

export async function saveTeacherSignature(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return { error: "Not allowed." };
  }

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) return { error: "No signature provided." };
  if (file.size > 1 * 1024 * 1024) return { error: "Signature must be under 1MB." };

  const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return { error: "Teacher not found." };

  const blob = await put(`signatures/teacher-${teacher.id}-${Date.now()}.png`, file, { access: "public" });

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { signatureUrl: blob.url },
  });

  revalidatePath("/dashboard/teacher/profile");
  return { success: true, url: blob.url };
}

export async function changeTeacherPassword(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return { error: "You are not allowed to do this." };
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword) {
    return { error: "Enter your current password." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (newPassword.length > 72) {
    return { error: "New password is too long." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (currentPassword === newPassword) {
    return { error: "New password must be different." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { error: "User not found." };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);

  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(newPassword);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  } catch {
    return { error: "Could not change your password." };
  }

  return { success: true };
}