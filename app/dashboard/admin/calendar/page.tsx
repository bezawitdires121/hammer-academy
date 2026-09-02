import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import CalendarManager from "./CalendarManager";

export default async function AdminCalendarPage() {
  await requireAdmin();

  const [schoolYears, events] =
    await Promise.all([
      prisma.schoolYear.findMany({
        orderBy: {
          startDate: "desc",
        },
      }),

      prisma.schoolCalendarEvent.findMany({
        include: {
          schoolYear: {
            select: {
              id: true,
              label: true,
            },
          },
        },
        orderBy: [
          {
            startDate: "asc",
          },
          {
            title: "asc",
          },
        ],
      }),
    ]);

  const initialEvents = events.map(
    (event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      startDate:
        event.startDate.toISOString(),
      endDate:
        event.endDate.toISOString(),
      isStudentClosed:
        event.isStudentClosed,
      note: event.note,
      schoolYear:
        event.schoolYear,
    }),
  );

  const initialSchoolYears =
    schoolYears.map((year) => ({
      id: year.id,
      label: year.label,
      isCurrent: year.isCurrent,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          School Calendar
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage the Ethiopian school calendar,
          holidays, closures, training days,
          exams, and important school dates.
        </p>
      </div>

      <CalendarManager
        initialEvents={initialEvents}
        schoolYears={initialSchoolYears}
      />
    </div>
  );
}