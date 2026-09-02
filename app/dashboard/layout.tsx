import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Role } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;

  if (
    role !== "ADMIN" &&
    role !== "TEACHER" &&
    role !== "STUDENT" &&
    role !== "LIBRARIAN" &&
    role !== "HEALTH"
  ) {
    redirect("/login");
  }

  const dashboardAcademicSchoolYear =
    await prisma.schoolYear.findFirst({
      where: {
        isCurrent: true,
      },
      select: {
        id: true,
        semesters: {
          where: {
            isCurrent: true,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

  const dashboardAcademicSchoolYearId =
    dashboardAcademicSchoolYear?.id ?? null;

  const dashboardAcademicSemesterId =
    dashboardAcademicSchoolYear?.semesters[0]?.id ?? null;
  let notificationCount = 0;

  try {
    if (role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: {
          userId: session.user.id,
        },
        select: {
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

      notificationCount =
        await prisma.notification.count({
          where: {
            userId: session.user.id,
            channel: "IN_APP",
            status: "SENT",
            readAt: null,
            OR: [
              /*
               * Messages are not academic-period records.
               * Keep them visible regardless of school year/semester.
               */
              {
                title: {
                  in: [
                    "New message from student",
                    "New message from teacher",
                  ],
                },
              },

              /*
               * Academic-period announcement notifications.
               */
              {
                AND: [
                  {
                    schoolYearId: dashboardAcademicSchoolYearId,
                  },
                  {
                    semesterId: dashboardAcademicSemesterId,
                  },
                  {
                    announcement: {
                      scope: "SCHOOL_WIDE",
                    },
                  },
                ],
              },

              /*
               * Section notifications for the current
               * academic period only.
               */
              {
                AND: [
                  {
                    schoolYearId: dashboardAcademicSchoolYearId,
                  },
                  {
                    semesterId: dashboardAcademicSemesterId,
                  },
                  {
                    sectionId: {
                      in: sectionIds,
                    },
                  },
                ],
              },

              {
                AND: [
                  {
                    schoolYearId: dashboardAcademicSchoolYearId,
                  },
                  {
                    semesterId: dashboardAcademicSemesterId,
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
            ],
          },
        });
    } else {
      notificationCount =
        await prisma.notification.count({
          where: {
            userId: session.user.id,
            channel: "IN_APP",
            status: "SENT",
            readAt: null,
            OR: [
              /*
               * Direct messages are not tied to an
               * academic period.
               */
              {
                title: {
                  in: [
                    "New message from student",
                    "New message from teacher",
                  ],
                },
              },

              /*
               * Student/receiver academic notifications.
               */
              {
                AND: [
                  {
                    schoolYearId: dashboardAcademicSchoolYearId,
                  },
                  {
                    semesterId: dashboardAcademicSemesterId,
                  },
                  {
                    announcementId: {
                      not: null,
                    },
                  },
                ],
              },

              /*
               * Result notifications also carry the
               * academic period.
               */
              {
                AND: [
                  {
                    schoolYearId: dashboardAcademicSchoolYearId,
                  },
                  {
                    semesterId: dashboardAcademicSemesterId,
                  },
                  {
                    announcementId: null,
                  },
                  {
                    title: {
                      contains: "result",
                      mode: "insensitive",
                    },
                  },
                ],
              },
            ],
          },
        });
    }
  } catch (error) {
    console.error(
      "Failed to load notification count:",
      error
    );

    notificationCount = 0;
  }

  let academicYears = null;

  if (role === "TEACHER" || role === "STUDENT") {
    academicYears = await prisma.schoolYear.findMany({
      orderBy: {
        startDate: "desc",
      },
      select: {
        id: true,
        label: true,
        isCurrent: true,
        semesters: {
          orderBy: {
            number: "asc",
          },
          select: {
            id: true,
            name: true,
            number: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
  }

  return (
    <DashboardShell
      role={role}
      notificationCount={notificationCount}
      schoolYears={academicYears?.map((year) => ({
        id: year.id,
        label: year.label,
        isCurrent: year.isCurrent,
        semesters: year.semesters.map((semester) => ({
          id: semester.id,
          name: semester.name,
          number: semester.number,
          startDate: semester.startDate.toISOString(),
          endDate: semester.endDate.toISOString(),
        })),
      }))}
    >
      {children}
    </DashboardShell>
  );
}



