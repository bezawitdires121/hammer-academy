"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { notifyUser } from "@/lib/notify";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";
import { normalizePhone } from "@/lib/phone";
const requestResetSchema = z.object({
  phone: z.string().min(9).max(15),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(9).max(15),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(72),
});


function generateOtp(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = requestResetSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { error: "Please enter a valid phone number." };
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });

  const genericResponse = {
    success: true,
    message: "If that phone number is registered, a code has been sent via SMS.",
  };

  if (!user || !user.isActive) {
    return genericResponse;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, code, expiresAt },
  });

  await notifyUser({
    userId: user.id,
    title: "Password Reset Code",
    message: `Your Hammer Academy password reset code is: ${code}. It expires in 10 minutes. Ignore this if you didn't request it.`,
  });

  await logAction(user.id, "PASSWORD_RESET_REQUESTED", "User", user.id, {});

  return genericResponse;
}

export async function verifyOtpAndReset(formData: FormData) {
  const parsed = verifyOtpSchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });

  if (!user) {
    return { error: "Invalid phone number or code." };
  }

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!resetToken) {
    return { error: "No reset code found. Please request a new one." };
  }
  if (resetToken.expiresAt < new Date()) {
    return { error: "This code has expired. Please request a new one." };
  }
  if (resetToken.attempts >= 5) {
    return { error: "Too many incorrect attempts. Please request a new code." };
  }
  if (resetToken.code !== parsed.data.code) {
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { attempts: { increment: 1 } },
    });
    return { error: "Incorrect code." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  await logAction(user.id, "PASSWORD_RESET_COMPLETED", "User", user.id, {});

  return { success: true };
}