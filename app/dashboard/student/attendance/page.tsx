import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireStudent } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { CalendarCheck } from "lucide-react";

type Props = {
  searchParams: Promise<{
    schoolYearId?: string;
    semesterId?: string;
  }>;
};

const statusColors: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-yellow-100 text-yellow-700",
  PERMISSION_GIVEN: "bg-blue-100 text-blue-700",
};

function formatDate(date: Date) {
  return formatEthiopianDisplay(date);
}

export default async function StudentAttendancePage({
  searchParams,
}: Props) {
  const session = await requireStudent();
  const params = await searchParams;

  const student = await prisma.student.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!student) {
    return null;
  }

  const schoolYears = await prisma.schoolYear.findMany({
    orderBy: {
      startDate: "desc",
    },
    select: {
      id: true,
      label: true,
      startDate: true,
      endDate: true,
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
          isCurrent: true,
        },
      },
    },
  });

  if (schoolYears.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your attendance records.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <CalendarCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">
            No school years available
          </h2>
        </div>
      </div>
    );
  }

  const selectedSchoolYear =
    schoolYears.find(
      (schoolYear) => schoolYear.id === params.schoolYearId,
    ) ??
    schoolYears.find((schoolYear) => schoolYear.isCurrent) ??
    schoolYears[0];

  const semesters = selectedSchoolYear.semesters;

  const selectedSemester =
    semesters.find(
      (semester) => semester.id === params.semesterId,
    ) ??
    semesters.find((semester) => semester.isCurrent) ??
    semesters.find((semester) => semester.number === 1) ??
    semesters[0] ??
    null;

  /*
   * IMPORTANT:
   * Attendance is filtered by the selected SEMESTER.
   *
   * Do NOT filter only by school year. Otherwise attendance
   * entered in Semester 1 will also appear in Semester 2.
   *
   * The database semester dates are the source of truth.
   */
  let semesterStart: Date | null = null;
  let semesterEnd: Date | null = null;

  if (selectedSemester) {
    semesterStart = new Date(selectedSemester.startDate);
    semesterEnd = new Date(selectedSemester.endDate);

    if (
      Number.isNaN(semesterStart.getTime()) ||
      Number.isNaN(semesterEnd.getTime())
    ) {
      semesterStart = null;
      semesterEnd = null;
    } else {
      semesterStart.setUTCHours(0, 0, 0, 0);
      semesterEnd.setUTCHours(23, 59, 59, 999);
    }
  }

  const records = await prisma.attendance.findMany({
    where: {
      studentId: student.id,

      section: {
        schoolYearId: selectedSchoolYear.id,
      },

      ...(semesterStart && semesterEnd
        ? {
            date: {
              gte: semesterStart,
              lte: semesterEnd,
            },
          }
        : {}),
    },

    include: {
      section: {
        include: {
          grade: true,
        },
      },
    },

    orderBy: {
      date: "desc",
    },

    take: 1000,
  });

  const present = records.filter(
    (record) => record.status === "PRESENT",
  ).length;

  const absent = records.filter(
    (record) => record.status === "ABSENT",
  ).length;

  const late = records.filter(
    (record) => record.status === "LATE",
  ).length;

  const permission = records.filter(
    (record) => record.status === "PERMISSION_GIVEN",
  ).length;

  const pct =
    records.length > 0
      ? Math.round((present / records.length) * 100)
      : 0;

  function buildUrl(
    schoolYearId: string,
    semesterId?: string,
  ) {
    const query = new URLSearchParams();

    query.set("schoolYearId", schoolYearId);

    if (semesterId) {
      query.set("semesterId", semesterId);
    }

    return `/dashboard/student/attendance?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My Attendance
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Attendance records for the selected school year and semester.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              School Year
            </p>

            <div className="flex flex-wrap gap-2">
              {schoolYears.map((schoolYear) => (
                <a
                  key={schoolYear.id}
                  href={buildUrl(schoolYear.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    schoolYear.id === selectedSchoolYear.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {schoolYear.label}
                  {schoolYear.isCurrent ? " — Current" : ""}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Semester
            </p>

            <div className="flex flex-wrap gap-2">
              {semesters.map((semester) => (
                <a
                  key={semester.id}
                  href={buildUrl(
                    selectedSchoolYear.id,
                    semester.id,
                  )}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    selectedSemester?.id === semester.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {semester.name}
                  {semester.isCurrent ? " — Current" : ""}
                </a>
              ))}
            </div>
          </div>
        </div>

        {selectedSemester && (
          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Dates
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(new Date(selectedSemester.startDate))}
              {" – "}
              {formatDate(new Date(selectedSemester.endDate))}
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          My Attendance
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Attendance Rate",
              value: `${pct}%`,
              color: "text-green-600",
            },
            {
              label: "Present",
              value: present,
              color: "text-green-600",
            },
            {
              label: "Absent",
              value: absent,
              color: "text-red-600",
            },
            {
              label: "Late",
              value: late,
              color: "text-yellow-600",
            },
            {
              label: "Permission",
              value: permission,
              color: "text-blue-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${item.color}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">
            Attendance Records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {selectedSchoolYear.label}
            {selectedSemester
              ? ` • ${selectedSemester.name}`
              : ""}
          </p>
        </div>

        {records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <CalendarCheck className="mx-auto h-10 w-10 text-slate-300" />

            <h3 className="mt-4 font-semibold text-slate-900">
              No attendance records
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              No attendance has been recorded for this semester.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(new Date(record.date))}
                  </p>

                  {record.reason && (
                    <p className="mt-1 text-xs text-slate-500">
                      {record.reason}
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    statusColors[record.status] ??
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {record.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
