import { prisma } from "@/lib/prisma";

export async function notifyUser({
  userId,
  title,
  message,
  announcementId,
  sectionId,
}: {
  userId: string;
  title: string;
  message: string;
  announcementId?: string;
  sectionId?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) return;

  /*
   * If this notification belongs to an announcement,
   * copy the announcement's exact School Year and Semester.
   *
   * This guarantees that the recipient notification keeps
   * the same academic context as the announcement itself.
   */
  let schoolYearId: string | undefined;
  let semesterId: string | undefined;

  if (announcementId) {
    const announcement = await prisma.announcement.findUnique({
      where: {
        id: announcementId,
      },
      select: {
        schoolYearId: true,
        semesterId: true,
      },
    });

    if (announcement) {
      schoolYearId = announcement.schoolYearId;
      semesterId = announcement.semesterId;
    }
  }

  await prisma.notification.create({
    data: {
      userId,
      channel: "IN_APP",
      status: "SENT",
      sentAt: new Date(),
      title,
      message,
      announcementId,
      sectionId,
      schoolYearId,
      semesterId,
    },
  });
}

export async function notifyMultipleUsers(
  userIds: string[],
  title: string,
  message: string,
  announcementId?: string,
  sectionId?: string
) {
  await Promise.all(
    userIds.map((userId) =>
      notifyUser({
        userId,
        title,
        message,
        announcementId,
        sectionId,
      })
    )
  );
}
