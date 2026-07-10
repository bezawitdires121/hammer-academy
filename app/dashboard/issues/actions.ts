"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { createIssueSchema, respondToIssueSchema } from "@/lib/validations";
import { logAction } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function submitIssue(formData: FormData) {
  const user = await requireRole(["PARENT"]);

  const parsed = createIssueSchema.safeParse({
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const parentProfile = await prisma.parent.findUnique({ where: { userId: user.id } });
  if (!parentProfile) return { error: "Parent profile not found." };

  const issue = await prisma.parentIssue.create({
    data: {
      parentId: parentProfile.id,
      message: parsed.data.message,
      status: "OPEN",
    },
  });

  await logAction(user.id, "ISSUE_SUBMITTED", "ParentIssue", issue.id, {});

  revalidatePath("/dashboard/issues");
  return { success: true };
}

export async function respondToIssue(formData: FormData) {
  // Per your spec, either an admin or a teacher can respond
  const user = await requireRole(["ADMIN", "TEACHER"]);

  const parsed = respondToIssueSchema.safeParse({
    issueId: formData.get("issueId"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { issueId, message } = parsed.data;

  const issue = await prisma.parentIssue.findUnique({
    where: { id: issueId },
    include: { parent: { include: { user: true } }, response: true },
  });

  if (!issue) return { error: "Issue not found." };
  if (issue.response) return { error: "This issue already has a response." };

  await prisma.issueResponse.create({
    data: {
      parentIssueId: issueId,
      respondedById: user.id,
      message,
    },
  });

  await prisma.parentIssue.update({
    where: { id: issueId },
    data: { status: "RESPONDED" },
  });

  await logAction(user.id, "ISSUE_RESPONDED", "ParentIssue", issueId, {});

  // Mandatory notification per your spec: "Parent issues must always get a response"
  const linkSuffix = ` Full response: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/issues`;
  const prefix = `School responded: `;
  const maxResponseLength = 160 - prefix.length - linkSuffix.length;
  const responsePreview =
    message.length > maxResponseLength
      ? message.slice(0, Math.max(maxResponseLength - 3, 0)) + "..."
      : message;

  await notifyUser({
    userId: issue.parent.user.id,
    title: "Issue Response Received",
    message: `${prefix}${responsePreview}${linkSuffix}`,
  });

  revalidatePath("/dashboard/issues");
  return { success: true };
}