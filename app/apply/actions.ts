"use server";

import { prisma } from "@/lib/prisma";
import { EmployeeRole } from "@prisma/client";
import { teacherApplicationSchema } from "@/lib/validations";
import { put } from "@vercel/blob";

export async function submitTeacherApplication(
  formData: FormData
) {
  const parsed = teacherApplicationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    requestedRole:
      formData.get("requestedRole") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    };
  }

  const photo = formData.get("photo") as File | null;

  if (!photo || photo.size === 0) {
    return {
      error: "Please upload your photo.",
    };
  }

  if (photo.size > 5 * 1024 * 1024) {
    return {
      error: "Photo must be under 5MB.",
    };
  }

  if (!photo.type.startsWith("image/")) {
    return {
      error: "Please upload a valid image.",
    };
  }

  const email = parsed.data.email
    .trim()
    .toLowerCase();

  const requestedRole = (
    parsed.data.requestedRole || "TEACHER"
  ) as EmployeeRole;

  /*
   * Prevent an email from being used by an existing
   * authenticated account.
   */
  const existingUser =
    await prisma.user.findUnique({
      where: { email },
    });

  if (existingUser) {
    return {
      error:
        "An account with this email already exists.",
    };
  }

  /*
   * Prevent duplicate pending applications
   * for the same role.
   */
  const existingApplication =
    await prisma.teacherApplication.findFirst({
      where: {
        email,
        requestedRole,
        status: {
          in: ["PENDING", "UNDER_REVIEW"],
        },
      },
    });

  if (existingApplication) {
    return {
      error:
        "You already have an application for this role.",
    };
  }

  /*
   * Upload applicant photo.
   */
  const blob = await put(
    `teacher-applications/${Date.now()}-${photo.name}`,
    photo,
    {
      access: "public",
    }
  );

  /*
   * No password is collected from the applicant.
   *
   * The application stays PENDING until an admin
   * accepts it.
   *
   * The actual User account and generated Login ID
   * are created during the admin acceptance process.
   */
  await prisma.teacherApplication.create({
    data: {
      fullName: parsed.data.fullName.trim(),
      email,
      phone: parsed.data.phone?.trim() || null,
      photoUrl: blob.url,
      status: "PENDING",
      requestedRole,

      clubType:
        typeof formData.get("clubType") === "string"
          ? (formData.get("clubType") as string).trim()
          : null,

      passwordHash: null,
    },
  });

  return {
    success: true,
  };
}