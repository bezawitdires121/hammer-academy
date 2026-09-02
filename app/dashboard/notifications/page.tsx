import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ArrowLeft,
  Send,
  Inbox,
  Pencil,
} from "lucide-react";
import { revalidatePath } from "next/cache";

async function markNotificationRead(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user?.id) return;

  const notificationId = String(
    formData.get("notificationId") ?? ""
  );

  if (!notificationId) return;

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
      channel: "IN_APP",
      status: "SENT",
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}
async function markAllNotificationsRead(formData: FormData) {
  "use server";

  const selectedSchoolYearId = String(
    formData.get("schoolYearId") ?? ""
  );

  const selectedSemesterId = String(
    formData.get("semesterId") ?? ""
  );

  const session = await auth();

  if (!session?.user?.id) return;

  /*
   * Only mark notifications that are currently visible
   * to this user as read.
   *
   * Old notifications from previous sections are intentionally
   * not touched.
   */
  const userId = session.user.id;

  if (session.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: {
        userId,
      },
      select: {
        subjectAssignments: {
          where: {
            section: {
              schoolYearId: selectedSchoolYearId,
            },
          },
          select: {
            sectionId: true,
          },
        },
        homeroomSections: {
          where: {
            schoolYearId: selectedSchoolYearId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    const sectionIds = Array.from(
      new Set([
        ...(teacher?.subjectAssignments.map(
          (x) => x.sectionId
        ) ?? []),
        ...(teacher?.homeroomSections.map(
          (x) => x.id
        ) ?? []),
      ])
    );

    await prisma.notification.updateMany({
      where: {
        userId,
        schoolYearId: selectedSchoolYearId,
        semesterId: selectedSemesterId,
        channel: "IN_APP",
        status: "SENT",
        readAt: null,
        OR: [
          {
            title: {
              in: [
                "New message from student",
                "New message from teacher",
              ],
            },
          },
          {
            announcement: {
              scope: "SCHOOL_WIDE",
            },
          },
          {
            sectionId: {
              in: sectionIds,
            },
          },
          {
            announcement: {
              sectionId: {
                in: sectionIds,
              },
            },
          },
        ],
      },
      data: {
        readAt: new Date(),
      },
    });
  } else {
    await prisma.notification.updateMany({
      where: {
        userId,
        schoolYearId: selectedSchoolYearId,
        semesterId: selectedSemesterId,
        channel: "IN_APP",
        status: "SENT",
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    schoolYearId?: string;
    semesterId?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }
  const params = (await searchParams) ?? {};

  const requestedSchoolYearId = params.schoolYearId ?? "";
  const requestedSemesterId = params.semesterId ?? "";

  const notificationSchoolYears = await prisma.schoolYear.findMany({
    include: {
      semesters: {
        orderBy: {
          startDate: "asc",
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  const notificationSchoolYear =
    notificationSchoolYears.find(
      (year) => year.id === requestedSchoolYearId
    ) ??
    notificationSchoolYears.find((year) => year.isCurrent) ??
    notificationSchoolYears[0];

  const notificationSemesters =
    notificationSchoolYear?.semesters ?? [];

  const notificationSemester =
    notificationSemesters.find(
      (semester) => semester.id === requestedSemesterId
    ) ??
    notificationSemesters.find((semester) => semester.isCurrent) ??
    notificationSemesters[0];

  const notificationSchoolYearId =
    notificationSchoolYear?.id ?? "";

  const notificationSemesterId =
    notificationSemester?.id ?? "";


    /*
   * SECTION-AWARE NOTIFICATIONS
   *
   * Teachers only see notifications connected to their
   * CURRENT school-year sections.
   *
   * Old notifications from previous school years/sections
   * are therefore not accessible from this page.
   */

  let relevantSectionIds: string[] = [];

  if (session.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        homeroomSections: {
          where: {
            schoolYear: {
              isCurrent: true,
            },
          },
          select: {
            id: true,
          },
        },
        subjectAssignments: {
          where: {
            section: {
              schoolYear: {
                isCurrent: true,
              },
            },
          },
          select: {
            sectionId: true,
          },
        },
      },
    });

    if (teacher) {
      relevantSectionIds = [
        ...teacher.homeroomSections.map(
          (section) => section.id
        ),
        ...teacher.subjectAssignments.map(
          (assignment) => assignment.sectionId
        ),
      ];

      relevantSectionIds = [
        ...new Set(relevantSectionIds),
      ];
    }
  }

  const notifications = await prisma.notification.findMany({
    where:
      session.user.role === "TEACHER"
        ? {
            userId: session.user.id,
            schoolYearId: notificationSchoolYearId,
            semesterId: notificationSemesterId,
            channel: "IN_APP",
            status: "SENT",
            OR: [
              {
                announcement: {
                  scope: "SCHOOL_WIDE",
                },
              },
              {
                sectionId: {
                  in: relevantSectionIds,
                },
              },
            ],
          }
        : {
            userId: session.user.id,
            
              schoolYearId: notificationSchoolYearId,
              semesterId: notificationSemesterId,channel: "IN_APP",
            status: "SENT",
          },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      announcement: {
        include: {
          section: {
            include: {
              grade: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              role: true,
              adminProfile: {
                select: {
                  fullName: true,
                },
              },
              teacherProfile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      },
    },
  });
  /*
   * ============================================================
   * CURRENT ACCESS
   * ============================================================
   */

  let currentSectionIds: string[] = [];
  let currentHomeroomSectionIds: string[] = [];

  if (session.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        subjectAssignments: {
          where: {
            section: {
              schoolYearId: notificationSchoolYearId,
            },
          },
          select: {
            sectionId: true,
          },
        },
        homeroomSections: {
          where: {
            schoolYearId: notificationSchoolYearId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    currentSectionIds = Array.from(
      new Set(
        teacher?.subjectAssignments.map(
          (assignment) => assignment.sectionId
        ) ?? []
      )
    );

    currentHomeroomSectionIds =
      teacher?.homeroomSections.map(
        (section) => section.id
      ) ?? [];

    currentSectionIds = Array.from(
      new Set([
        ...currentSectionIds,
        ...currentHomeroomSectionIds,
      ])
    );
  }

  /*
   * ============================================================
   * FILTER RECEIVED NOTIFICATIONS
   *
   * THIS IS THE IMPORTANT PART.
   *
   * A teacher only sees:
   *
   * 1. School-wide notifications
   * 2. Notifications attached to a section they CURRENTLY teach
   * 3. Notifications attached to their CURRENT homeroom
   *
   * Therefore:
   *
   * 2018 Grade 1A -> teacher moved away -> HIDDEN
   * 2019 Grade 2A -> current assignment -> VISIBLE
   * ============================================================
   */

  const visibleNotifications =
    notifications.filter((notification) => {
      /*
       * ADMIN sees all notifications.
       */
      if (session.user.role === "ADMIN") {
        return true;
      }

      /*
       * Teacher notifications.
       */
      if (session.user.role === "TEACHER") {
        /*
         * Message notification.
         *
         * Message notifications do not have an announcement
         * or sectionId, so they must be accepted directly.
         */
        if (
          notification.title === "New message from student" ||
          notification.title === "New message from teacher"
        ) {
          return true;
        }

        /*
         * Announcement notification.
         */
        if (notification.announcement) {
          const announcement =
            notification.announcement;

          /*
           * School-wide announcements remain visible.
           */
          if (announcement.scope === "SCHOOL_WIDE") {
            return true;
          }

          /*
           * Section announcement:
           * only selected-school-year section access.
           */
          if (announcement.sectionId) {
            return currentSectionIds.includes(
              announcement.sectionId
            );
          }

          /*
           * Grade-only or malformed old notification:
           * do not show to teacher.
           */
          return false;
        }

        /*
         * Result notification.
         *
         * sectionId is now stored directly on Notification.
         *
         * IMPORTANT:
         * If an old result notification has NULL sectionId,
         * it cannot be proven to belong to the teacher's
         * current section, so hide it.
         */
        if (notification.sectionId) {
          return currentSectionIds.includes(
            notification.sectionId
          );
        }

        return false;
      }

      /*
       * Students:
       * section-linked notifications are only visible when
       * they belong to the student's current section.
       *
       * For notifications without section information,
       * retain the existing behavior.
       */
      if (session.user.role === "STUDENT") {
        return true;
      }

      return true;
    });

  /*
   * ============================================================
   * SENT ANNOUNCEMENTS
   * ============================================================
   *
   * Teacher only sees announcements from their CURRENT
   * homeroom section.
   */

  let sentAnnouncements: any[] = [];

  if (session.user.role === "ADMIN") {
    sentAnnouncements =
      await prisma.announcement.findMany({
        where: {
          createdById: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        include: {
          section: {
            include: {
              grade: true,
              schoolYear: true,
            },
          },
        },
      });
  } else if (
    session.user.role === "TEACHER" &&
    currentHomeroomSectionIds.length > 0
  ) {
    sentAnnouncements =
      await prisma.announcement.findMany({
        where: {
          createdById: session.user.id,
          sectionId: {
            in: currentHomeroomSectionIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        include: {
          section: {
            include: {
              grade: true,
              schoolYear: true,
            },
          },
        },
      });
  }

  const unreadCount =
    visibleNotifications.filter(
      (notification) =>
        notification.readAt === null
    ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>

            <h1 className="text-2xl font-black text-slate-900">
              Notifications
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "You're all caught up."}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <input
              type="hidden"
              name="schoolYearId"
              value={notificationSchoolYearId}
            />
            <input
              type="hidden"
              name="semesterId"
              value={notificationSemesterId}
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <CheckCheck size={17} />
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Inbox size={19} />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">
              Received
            </h2>

            <p className="text-sm text-slate-500">
              Notifications and updates sent to you.
            </p>
          </div>
        </div>

        {visibleNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Bell className="mx-auto h-7 w-7 text-slate-400" />

            <p className="mt-3 font-bold text-slate-700">
              No received notifications
            </p>

            <p className="mt-1 text-sm text-slate-500">
              New relevant announcements and result updates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map(
              (notification) => {
                const unread =
                  notification.readAt === null;

                const isResult =
                  notification.title ===
                  "Result updated" ||
                  notification.title ===
                  "Semester result submitted";

                return (
                  <div
                    key={notification.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                      unread
                        ? "border-blue-200 bg-blue-50/30"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isResult
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <Bell size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {notification.title}
                            </h3>

                            {unread && (
                              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                          </div>

                          <span className="shrink-0 text-xs text-slate-400">
                            {formatEthiopianDisplay(notification.createdAt)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {notification.message}
                        </p>

                        {notification.announcement?.createdBy && (
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            From:{" "}
                            {notification.announcement.createdBy.adminProfile?.fullName ??
                              notification.announcement.createdBy.teacherProfile?.fullName ??
                              notification.announcement.createdBy.role}
                          </p>
                        )}

                        {
  (
    notification.title === "New message from student" ||
    notification.title === "New message from teacher" ||
    notification.title === "New message from admin"
  ) && (
                          <div className="mt-2">
                            <Link
                              href={
  notification.title === "New message from student"
    ? "/dashboard/admin/messages"
    : notification.title === "New message from teacher"
      ? "/dashboard/student/messages"
      : notification.title === "New message from admin"
        ? "/dashboard/student/messages"
        : session.user.role === "TEACHER"
          ? "/dashboard/teacher/messages"
          : "/dashboard/student/messages"
}
                              className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              View message
                            </Link>
                          </div>
                        )}

                        {notification.title === "New homework assigned" && (
                          <div className="mt-2">
                            <Link
                              href="/dashboard/student/homework"
                              className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              View homework
                            </Link>
                          </div>
                        )}

                        {isResult && (
                          <div className="mt-2">
                            <Link
                              href="/dashboard/student/results"
                              className="inline-flex items-center rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-100"
                            >
                              View result
                            </Link>
                          </div>
                        )}

                        {notification.announcement && (
  <div className="mt-2">
    <Link
      href="/dashboard/announcements"
      className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
    >
      View announcement
    </Link>

    {session.user.role === "TEACHER" && unread && (
      <form action={markNotificationRead}>
        <input
          type="hidden"
          name="notificationId"
          value={notification.id}
        />

        <button
          type="submit"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          Mark as read
        </button>
      </form>
    )}
  </div>
)}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {(session.user.role === "ADMIN" ||
        currentHomeroomSectionIds.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <Send size={19} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Sent
              </h2>

              <p className="text-sm text-slate-500">
                Announcements you have sent.
              </p>
            </div>
          </div>

          {sentAnnouncements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Send className="mx-auto h-7 w-7 text-slate-400" />

              <p className="mt-3 font-bold text-slate-700">
                Nothing sent yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Announcements you create will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sentAnnouncements.map(
                (announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {announcement.title}
                          </h3>

                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">
                            Sent
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {announcement.body}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>
                            {formatEthiopianDisplay(announcement.createdAt)}
                          </span>

                          <span>•</span>

                          <span>
                            {announcement.scope
                              .replace("_", " ")
                              .toLowerCase()
                              .replace(
                                /^\w/,
                                (letter: string) =>
                                  letter.toUpperCase()
                              )}
                          </span>

                          {announcement.section && (
                            <>
                              <span>•</span>

                              <span>
                                Grade{" "}
                                {
                                  announcement.section
                                    .grade.level
                                }
                                {
                                  announcement.section
                                    .label
                                }
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/dashboard/announcements?edit=${announcement.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

















