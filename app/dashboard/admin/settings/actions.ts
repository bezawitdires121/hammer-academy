"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

export async function getSchoolSettings() {
  const settings = await prisma.schoolSettings.findUnique({
    where: { id: 1 },
  });

  if (!settings) {
    return prisma.schoolSettings.create({
      data: {},
    });
  }

  return settings;
}

export async function updateSchoolSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Not allowed." };
  }

  const schoolName = String(formData.get("schoolName") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const directorName = String(formData.get("directorName") || "").trim();

  if (!schoolName) return { error: "School name is required." };

  const current = await prisma.schoolSettings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  let logoUrl = current.logoUrl;
  let stampUrl = current.stampUrl;

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/")) return { error: "Logo must be an image." };
    if (logo.size > 2 * 1024 * 1024) return { error: "Logo must be under 2MB." };
    const blob = await put(`school/logo-${Date.now()}-${logo.name}`, logo, { access: "public" });
    logoUrl = blob.url;
  }

  const stamp = formData.get("stamp");
  if (stamp instanceof File && stamp.size > 0) {
    if (!stamp.type.startsWith("image/")) return { error: "Stamp must be an image." };
    if (stamp.size > 2 * 1024 * 1024) return { error: "Stamp must be under 2MB." };
    const blob = await put(`school/stamp-${Date.now()}-${stamp.name}`, stamp, { access: "public" });
    stampUrl = blob.url;
  }

  await prisma.schoolSettings.upsert({
    where: { id: 1 },
    create: { schoolName, address, phone, email, directorName, logoUrl, stampUrl },
    update: { schoolName, address, phone, email, directorName, logoUrl, stampUrl },
  });

  revalidatePath("/dashboard/admin/settings");
  return { success: true };
}

export async function saveAdminSignature(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Not allowed." };
  }

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) return { error: "No signature provided." };
  if (file.size > 1 * 1024 * 1024) return { error: "Signature must be under 1MB." };

  const admin = await prisma.admin.findUnique({ where: { userId: session.user.id } });
  if (!admin) return { error: "Admin not found." };

  const blob = await put(`signatures/admin-${admin.id}-${Date.now()}.png`, file, { access: "public" });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { signatureUrl: blob.url },
  });

  await prisma.schoolSettings.upsert({
    where: { id: 1 },
    create: {
      directorSignatureUrl: blob.url,
    },
    update: {
      directorSignatureUrl: blob.url,
    },
  });

  revalidatePath("/dashboard/admin/settings");
  return { success: true, url: blob.url };
}


