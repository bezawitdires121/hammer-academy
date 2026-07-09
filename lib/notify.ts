import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

export async function notifyUser({
  userId,
  title,
  message,
  announcementId,
}: {
  userId: string;
  title: string;
  message: string;
  announcementId?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const notification = await prisma.notification.create({
    data: {
      userId,
      channel: "SMS",
      status: "PENDING",
      title,
      message,
      announcementId,
    },
  });

  if (!user.phone) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "FAILED", error: "No phone number on file." },
    });
    return;
  }

  const result = await sendSms(user.phone, message);

  await prisma.notification.update({
    where: { id: notification.id },
    data: result.success
      ? { status: "SENT", sentAt: new Date() }
      : { status: "FAILED", error: result.error },
  });

  await prisma.notification.create({
    data: {
      userId,
      channel: "IN_APP",
      status: "SENT",
      sentAt: new Date(),
      title,
      message,
      announcementId,
    },
  });
}

export async function notifyMultipleUsers(
  userIds: string[],
  title: string,
  message: string,
  announcementId?: string
) {
  await Promise.all(
    userIds.map((userId) => notifyUser({ userId, title, message, announcementId }))
  );
}