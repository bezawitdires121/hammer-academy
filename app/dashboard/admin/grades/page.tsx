import { prisma } from "@/lib/prisma";
import GradeSectionsManager from "./GradeSectionsManager";

export default async function AdminGradesPage() {
  const [grades, schoolYears] = await Promise.all([
    prisma.grade.findMany({
      orderBy: {
        level: "asc",
      },
      include: {
        sections: {
          include: {
            schoolYear: true,
            homeroomTeacher: {
              select: {
                id: true,
                fullName: true,
                photoUrl: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
          orderBy: {
            label: "asc",
          },
        },
      },
    }),

    prisma.schoolYear.findMany({
      orderBy: {
        startDate: "desc",
      },
    }),
  ]);

  return (
    <GradeSectionsManager
      grades={grades.map((grade) => ({
        id: grade.id,
        level: grade.level,

        sections: grade.sections.map((section) => ({
          id: section.id,
          label: section.label,
          schoolYearId: section.schoolYearId,
          schoolYearLabel: section.schoolYear.label,

          studentCount: section._count.enrollments,

          homeroomTeacher: section.homeroomTeacher
            ? {
                id: section.homeroomTeacher.id,
                fullName: section.homeroomTeacher.fullName,
                photoUrl: section.homeroomTeacher.photoUrl,
              }
            : null,
        })),
      }))}

      schoolYears={schoolYears.map((year) => ({
        id: year.id,
        label: year.label,
        startDate: year.startDate.toISOString(),
        endDate: year.endDate.toISOString(),
        isCurrent: year.isCurrent,
      }))}
    />
  );
}