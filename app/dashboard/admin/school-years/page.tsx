import { prisma } from "@/lib/prisma";
import SchoolYearManager from "./SchoolYearManager";

export default async function AdminSchoolYearsPage() {
  const schoolYears = await prisma.schoolYear.findMany({
    include: {
      semesters: {
        orderBy: {
          number: "asc",
        },
      },
    },
    orderBy: {
      label: "desc",
    },
  });

  return (
    <SchoolYearManager
      schoolYears={schoolYears.map((year) => ({
        id: year.id,
        label: year.label,
        startDate: year.startDate.toISOString(),
        endDate: year.endDate.toISOString(),
        isCurrent: year.isCurrent,
        semesters: year.semesters.map((semester) => ({
          id: semester.id,
          name: semester.name,
          number: semester.number,
          startDate: semester.startDate.toISOString(),
          endDate: semester.endDate.toISOString(),
          isCurrent: semester.isCurrent,
          isLocked: semester.isLocked,
        })),
      }))}
    />
  );
}

