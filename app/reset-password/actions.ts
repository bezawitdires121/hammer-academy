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

async function createResetToken(userId: string, token: string, expiresAt: Date) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO password_reset_tokens ("userId", token, "expiresAt", "createdAt") VALUES ($1, $2, $3, NOW())`,
    userId,
    token,
    expiresAt
  );
}

async function findResetTokenByToken(token: string) {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; userId: string; token: string; expiresAt: Date; usedAt: Date | null }>
  >(
    `SELECT id, "userId", token, "expiresAt", "usedAt" FROM password_reset_tokens WHERE token = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    token
  );

  return rows[0] ?? null;
}

async function markResetTokenUsed(id: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE password_reset_tokens SET "usedAt" = NOW() WHERE id = $1`,
    id
  );
}

type RequestPasswordResetResult = { success: true; message: string } | { error: string };
type VerifyOtpAndResetResult = { success: true } | { error: string };

export async function requestPasswordReset(formData: FormData): Promise<RequestPasswordResetResult> {
  const parsed = requestResetSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { error: "Please enter a valid phone number." };
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });

  const genericResponse: RequestPasswordResetResult = {
    success: true,
    message: "If that phone number is registered, a code has been sent via SMS.",
  };

  if (!user || !user.isActive) {
    return genericResponse;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await createResetToken(user.id, code, expiresAt);

  await notifyUser({
    userId: user.id,
    title: "Password Reset Code",
    message: `Your Hammer Academy password reset code is: ${code}. It expires in 10 minutes. Ignore this if you didn't request it.`,
  });

  await logAction(user.id, "PASSWORD_RESET_REQUESTED", "User", user.id, {});

  return genericResponse;
}

export async function verifyOtpAndReset(formData: FormData): Promise<VerifyOtpAndResetResult> {
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

  const resetToken = await findResetTokenByToken(parsed.data.code);

  if (!resetToken) {
    return { error: "Invalid phone number or code." };
  }
  if (resetToken.userId !== user.id) {
    return { error: "Invalid phone number or code." };
  }
  if (resetToken.usedAt) {
    return { error: "This code has already been used." };
  }
  if (resetToken.expiresAt < new Date()) {
    return { error: "This code has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await markResetTokenUsed(resetToken.id);

  await logAction(user.id, "PASSWORD_RESET_COMPLETED", "User", user.id, {});

  return { success: true };
}