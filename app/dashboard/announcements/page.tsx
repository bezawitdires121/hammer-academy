import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementEditForm from "./AnnouncementEditForm";
import AcademicPeriodSelector from "./AcademicPeriodSelector";
import { Pencil } from "lucide-react";

type Props = {
  searchParams: Promise<{
    edit?: string;
    schoolYearId?: string;
    semesterId?: string;
  }>;
};

export default async function AnnouncementsPage({
  searchParams,
}: Props) {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    return null;
  }

  const params = await searchParams;
  const editId = params.edit;

  const requestedSchoolYearId = params.schoolYearId ?? "";
  const requestedSemesterId = params.semesterId ?? "";

  const role = session.user.role;

  const schoolYears = await prisma.schoolYear.findMany({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      label: true,
      isCurrent: true,
      semesters: {
        orderBy: { number: "asc" },
        select: { id: true, name: true, number: true, isLocked: true },
      },
    },
  });

  const selectedSchoolYear =
    schoolYears.find((year) => year.id === requestedSchoolYearId) ??
    schoolYears.find((year) => year.isCurrent) ??
    schoolYears[0];

  const semesters = selectedSchoolYear?.semesters ?? [];

  const selectedSemester =
    semesters.find((semester) => semester.id === requestedSemesterId) ??
    semesters[0];

  const selectedSchoolYearId = selectedSchoolYear?.id ?? "";
  const selectedSemesterId = selectedSemester?.id ?? "";if (!selectedSchoolYear || !selectedSemester) return null;


  let classes: {
    id: string;
    name: string;
  }[] = [];

  let canPostAnnouncement = role === "ADMIN";

  /*
   * Admins can target any section.
   */
  if (role === "ADMIN") {
    const sections = await prisma.section.findMany({
      include: {
        grade: true,
      },
      orderBy: [
        {
          grade: {
            level: "asc",
          },
        },
        {
          label: "asc",
        },
      ],
    });

    classes = sections.map((section) => ({
      id: section.id,
      name: `Grade ${section.grade.level}${section.label}`,
    }));
  }

  /*
   * Only a teacher who is actually assigned as a
   * homeroom teacher can post announcements.
   *
   * Homeroom teachers can only target their own section.
   */
  if (role === "TEACHER") {
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
            label: true,
            grade: {
              select: {
                level: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    const homeroom = teacher?.homeroomSections[0];

    if (homeroom) {
      canPostAnnouncement = true;

      classes = [
        {
          id: homeroom.id,
          name: `Grade ${homeroom.grade.level}${homeroom.label}`,
        },
      ];
    }
  }

  let announcementBeingEdited = null;

  if (editId) {
    const candidate = await prisma.announcement.findUnique({
      where: {
        id: editId,
      },
      select: {
        id: true,
        title: true,
        body: true,
        priority: true,
        createdById: true,
      },
    });

    if (
      candidate &&
      candidate.createdById === session.user.id
    ) {
      announcementBeingEdited = candidate;
    }
  }

  let announcements;

  if (role === "ADMIN") {
    announcements =
      await prisma.announcement.findMany({
        where: {
          schoolYearId: selectedSchoolYearId,
          semesterId: selectedSemesterId,
        },
        orderBy: {
          createdAt: "desc",
        },
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
      });
  } else if (role === "TEACHER") {
    /*
     * Teachers see:
     * - school-wide announcements
     * - announcements for their homeroom section
     */
    const teacher = await prisma.teacher.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        homeroomSections: {
          where: {
            schoolYearId: selectedSchoolYearId,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    const homeroomSectionId =
      teacher?.homeroomSections[0]?.id;

    announcements =
      await prisma.announcement.findMany({
        where: {
          OR: [
            {
              scope: "SCHOOL_WIDE",
            },
            ...(homeroomSectionId
              ? [
                  {
                    scope: "SECTION" as const,
                    sectionId: homeroomSectionId,
                  },
                ]
              : []),
          ],
          schoolYearId: selectedSchoolYearId,
          semesterId: selectedSemesterId,
        },
        orderBy: {
          createdAt: "desc",
        },
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
      });
  } else {
    /*
     * Students see:
     * - school-wide announcements
     * - their grade announcements
     * - their section announcements
     */
    let gradeId: string | undefined;
    let sectionId: string | undefined;

    const student =
      await prisma.student.findUnique({
        where: {
          userId: session.user.id,
        },
        include: {
          enrollments: {
            where: {
              status: "ACTIVE",
            },
            include: {
              section: true,
            },
            take: 1,
          },
        },
      });

    gradeId =
      student?.enrollments[0]?.section.gradeId;

    sectionId =
      student?.enrollments[0]?.sectionId;

    announcements =
      await prisma.announcement.findMany({
        where: {
          OR: [
            {
              scope: "SCHOOL_WIDE",
            },
            ...(gradeId
              ? [
                  {
                    scope: "GRADE" as const,
                    gradeId,
                  },
                ]
              : []),
            ...(sectionId
              ? [
                  {
                    scope: "SECTION" as const,
                    sectionId,
                  },
                ]
              : []),
          ],
          schoolYearId: selectedSchoolYearId,
          semesterId: selectedSemesterId,},
        orderBy: {
          createdAt: "desc",
        },
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
      });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Announcements
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          School announcements and important notices.
        </p>
      </div>

      {/* Academic period selector */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Academic Context
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose the school year and semester for these announcements.
          </p>
        </div>
        <AcademicPeriodSelector
          schoolYears={schoolYears}
          selectedSchoolYearId={selectedSchoolYearId}
          selectedSemesterId={selectedSemesterId}
        />

        <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">
            Selected:
          </span>{" "}
          {selectedSchoolYear.label} â€” {selectedSemester.name}
        </div>
      </section>
      {role === "ADMIN" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Post New Announcement
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create an announcement for the school, a grade, or a section.
            </p>
          </div>

          <AnnouncementForm
            role={role === "ADMIN" ? "ADMIN" : "TEACHER"}
            classes={classes}
            schoolYears={schoolYears}
            selectedSchoolYearId={selectedSchoolYear.id}
            selectedSemesterId={selectedSemester.id}
              semesterIsLocked={selectedSemester.isLocked}
          />
        </section>
      )}

      {announcementBeingEdited && (
        <section className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-700" />

            <h2 className="text-lg font-semibold text-slate-900">
              Edit Announcement
            </h2>
          </div>

          <p className="mb-5 text-sm text-slate-500">
            You can only edit announcements that you created.
          </p>

          <AnnouncementEditForm
            announcement={announcementBeingEdited}
          />
        </section>
      )}

      <section className="space-y-3">
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              No announcements yet.
            </p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`rounded-xl border bg-white p-5 shadow-sm ${
                announcement.priority
                  ? "border-red-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {announcement.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {announcement.body}
                  </p>
                </div>

                {announcement.priority && (
                  <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                    Priority
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>
                  {formatEthiopianDisplay(
                    announcement.createdAt
                  )}
                </span>

                <span>â€¢</span>

                <span>
                  {announcement.scope
                    .replace("_", " ")
                    .toLowerCase()
                    .replace(/^\w/, (letter) =>
                      letter.toUpperCase()
                    )}
                </span>

                {announcement.createdBy && (
                  <>
                    <span>â€¢</span>

                    <span>
                      Posted by{" "}
                      {announcement.createdBy.adminProfile?.fullName ??
                        announcement.createdBy.teacherProfile?.fullName ??
                        announcement.createdBy.role}
                    </span>

                    <span>â€¢</span>

                    <span>
                      {announcement.createdBy.role === "TEACHER"
                        ? "Homeroom Teacher"
                        : announcement.createdBy.role === "ADMIN"
                          ? "Administrator"
                          : announcement.createdBy.role}
                    </span>
                  </>
                )}

                {announcement.section && (
                  <>
                    <span>â€¢</span>

                    <span>
                      Grade{" "}
                      {announcement.section.grade.level}
                      {announcement.section.label}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}




























