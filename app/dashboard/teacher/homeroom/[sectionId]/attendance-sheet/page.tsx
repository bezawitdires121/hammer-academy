import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "./PrintButton";

type SearchParams = {
  from?: string;
  to?: string;
  includeWeekends?: string;
  includeClosed?: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  startDate: Date;
  endDate: Date;
  isStudentClosed: boolean;
  note: string | null;
};

/* =========================================================
   ETHIOPIAN / GREGORIAN CALENDAR HELPERS
========================================================= */

function ethiopianToGregorian(
  value: string,
): Date | null {
  const match = value
    .trim()
    .match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const maxDay = month === 13 ? 6 : 30;

  if (
    year < 1900 ||
    month < 1 ||
    month > 13 ||
    day < 1 ||
    day > maxDay
  ) {
    return null;
  }

  const gregorianYear =
    month <= 4 ? year + 7 : year + 8;

  const newYearDay =
    gregorianYear % 4 === 0 ? 12 : 11;

  const newYear = new Date(
    Date.UTC(
      gregorianYear,
      8,
      newYearDay,
    ),
  );

  const days =
    month <= 12
      ? (month - 1) * 30 + day - 1
      : 360 + day - 1;

  const result = new Date(newYear);

  result.setUTCDate(
    result.getUTCDate() + days,
  );

  return Number.isNaN(result.getTime())
    ? null
    : result;
}

function gregorianToEthiopian(
  date: Date,
) {
  const gYear = date.getUTCFullYear();
  const gMonth = date.getUTCMonth() + 1;
  const gDay = date.getUTCDate();

  let ecYear =
    gMonth >= 9
      ? gYear - 7
      : gYear - 8;

  const gregorianYear =
    ecYear + 7;

  const newYearDay =
    gregorianYear % 4 === 0
      ? 12
      : 11;

  let newYear = new Date(
    Date.UTC(
      gregorianYear,
      8,
      newYearDay,
    ),
  );

  let diff = Math.floor(
    (
      Date.UTC(
        gYear,
        gMonth - 1,
        gDay,
      ) -
      newYear.getTime()
    ) /
      (1000 * 60 * 60 * 24),
  );

  if (diff < 0) {
    ecYear -= 1;

    const previousGregorianYear =
      ecYear + 7;

    const previousNewYearDay =
      previousGregorianYear % 4 === 0
        ? 12
        : 11;

    newYear = new Date(
      Date.UTC(
        previousGregorianYear,
        8,
        previousNewYearDay,
      ),
    );

    diff = Math.floor(
      (
        Date.UTC(
          gYear,
          gMonth - 1,
          gDay,
        ) -
        newYear.getTime()
      ) /
        (1000 * 60 * 60 * 24),
    );
  }

  let month: number;
  let day: number;

  if (diff < 360) {
    month =
      Math.floor(diff / 30) + 1;

    day =
      (diff % 30) + 1;
  } else {
    month = 13;
    day =
      diff - 360 + 1;
  }

  return {
    year: ecYear,
    month,
    day,
  };
}

function formatEcDate(
  date: Date,
) {
  const ec =
    gregorianToEthiopian(date);

  return `${ec.year}/${String(
    ec.month,
  ).padStart(2, "0")}/${String(
    ec.day,
  ).padStart(2, "0")}`;
}

function dateKey(
  date: Date,
) {
  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getUTCDate(),
    ).padStart(2, "0"),
  ].join("-");
}

function isWeekend(
  date: Date,
) {
  const day =
    date.getUTCDay();

  return (
    day === 0 ||
    day === 6
  );
}

function datesBetween(
  start: Date,
  end: Date,
) {
  const dates: Date[] = [];

  const current =
    new Date(start);

  while (
    current.getTime() <=
    end.getTime()
  ) {
    dates.push(
      new Date(current),
    );

    current.setUTCDate(
      current.getUTCDate() + 1,
    );
  }

  return dates;
}

function eventContainsDate(
  event: CalendarEvent,
  date: Date,
) {
  const target =
    dateKey(date);

  return (
    target >=
      dateKey(event.startDate) &&
    target <=
      dateKey(event.endDate)
  );
}

function statusLetter(
  status: string | undefined,
) {
  switch (status) {
    case "PRESENT":
      return "P";

    case "ABSENT":
      return "A";

    case "LATE":
      return "L";

    case "PERMISSION_GIVEN":
      return "G";

    default:
      return "";
  }
}

function statusLabel(
  status: string | undefined,
) {
  switch (status) {
    case "PRESENT":
      return "Present";

    case "ABSENT":
      return "Absent";

    case "LATE":
      return "Late";

    case "PERMISSION_GIVEN":
      return "Permission";

    default:
      return "";
  }
}

/* =========================================================
   PAGE
========================================================= */

export default async function AttendanceSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{
    sectionId: string;
  }>;
  searchParams: Promise<SearchParams>;
}) {
  const session =
    await requireTeacher();

  const { sectionId } =
    await params;

  const query =
    await searchParams;

  /* -------------------------------------------------------
     Teacher
  ------------------------------------------------------- */

  const teacher =
    await prisma.teacher.findUnique({
      where: {
        userId: session.user.id,
      },
    });

  if (!teacher) {
    notFound();
  }

  /* -------------------------------------------------------
     Section
  ------------------------------------------------------- */

  const section =
    await prisma.section.findUnique({
      where: {
        id: sectionId,
      },
      include: {
        grade: true,
        schoolYear: true,
        enrollments: {
          where: {
            status: "ACTIVE",
          },
          include: {
            student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } },
          },
          orderBy: {
            student: {
              fullName: "asc",
            },
          },
        },
      },
    });

  if (!section) {
    notFound();
  }

  if (
    section.homeroomTeacherId !==
    teacher.id
  ) {
    notFound();
  }

  /* -------------------------------------------------------
     Default Ethiopian month
  ------------------------------------------------------- */

  const today =
    new Date();

  const todayEc =
    gregorianToEthiopian(
      today,
    );

  const daysInEcMonth =
    todayEc.month === 13
      ? (
          (todayEc.year + 1) %
            4 ===
          0
            ? 6
            : 5
        )
      : 30;

  const defaultFrom =
    `${todayEc.year}-${String(
      todayEc.month,
    ).padStart(2, "0")}-01`;

  const defaultTo =
    `${todayEc.year}-${String(
      todayEc.month,
    ).padStart(2, "0")}-${String(
      daysInEcMonth,
    ).padStart(2, "0")}`;

  const fromValue =
    query.from ??
    defaultFrom;

  const toValue =
    query.to ??
    defaultTo;

  /* -------------------------------------------------------
     Convert selected dates
  ------------------------------------------------------- */

  const fromDate =
    ethiopianToGregorian(
      fromValue,
    );

  const toDate =
    ethiopianToGregorian(
      toValue,
    );

  const validRange =
    !!fromDate &&
    !!toDate &&
    fromDate.getTime() <=
      toDate.getTime();

  const rangeStart =
    validRange && fromDate
      ? fromDate
      : ethiopianToGregorian(
          defaultFrom,
        )!;

  const rangeEnd =
    validRange && toDate
      ? toDate
      : ethiopianToGregorian(
          defaultTo,
        )!;

  /* -------------------------------------------------------
     Options
  ------------------------------------------------------- */

  const includeWeekends =
    query.includeWeekends ===
    "1";

  const includeClosed =
    query.includeClosed ===
    "1";

  /* -------------------------------------------------------
     Database data
  ------------------------------------------------------- */

  const [
    attendanceRecords,
    calendarEvents,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        sectionId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: [
        {
          date: "asc",
        },
        {
          studentId: "asc",
        },
      ],
    }),

    prisma.schoolCalendarEvent.findMany({
      where: {
        schoolYearId:
          section.schoolYearId,

        startDate: {
          lte: rangeEnd,
        },

        endDate: {
          gte: rangeStart,
        },
      },

      orderBy: {
        startDate: "asc",
      },
    }),
  ]);

  /* -------------------------------------------------------
     Attendance lookup
  ------------------------------------------------------- */

  const recordMap =
    new Map<
      string,
      (typeof attendanceRecords)[number]
    >();

  for (
    const record of
      attendanceRecords
  ) {
    recordMap.set(
      `${record.studentId}_${dateKey(
        record.date,
      )}`,
      record,
    );
  }

  /* -------------------------------------------------------
     All dates in selected range
  ------------------------------------------------------- */

  const allDates =
    datesBetween(
      rangeStart,
      rangeEnd,
    );

  /* -------------------------------------------------------
     Determine included dates
  ------------------------------------------------------- */

  const dates =
    allDates.filter(
      (date) => {
        const weekend =
          isWeekend(date);

        const closedEvent =
          calendarEvents.find(
            (event) =>
              event.isStudentClosed &&
              eventContainsDate(
                event,
                date,
              ),
          );

        if (
          weekend &&
          !includeWeekends
        ) {
          return false;
        }

        if (
          closedEvent &&
          !includeClosed
        ) {
          return false;
        }

        return true;
      },
    );

  /* -------------------------------------------------------
     Dynamic statistics
  ------------------------------------------------------- */

  const totalCalendarDays =
    allDates.length;

  const weekendDays =
    allDates.filter(
      (date) =>
        isWeekend(date),
    ).length;

  const closedDays =
    allDates.filter(
      (date) =>
        calendarEvents.some(
          (event) =>
            event.isStudentClosed &&
            eventContainsDate(
              event,
              date,
            ),
        ),
    ).length;

  const excludedWeekendDays =
    includeWeekends
      ? 0
      : weekendDays;

  const excludedClosedDays =
    includeClosed
      ? 0
      : closedDays;

  const includedWeekendDays =
    includeWeekends
      ? weekendDays
      : 0;

  const includedClosedDays =
    includeClosed
      ? closedDays
      : 0;

  /* -------------------------------------------------------
     Information for every displayed date
  ------------------------------------------------------- */

  const dayInfo =
    dates.map(
      (date) => {
        const closedEvent =
          calendarEvents.find(
            (event) =>
              event.isStudentClosed &&
              eventContainsDate(
                event,
                date,
              ),
          );

        const otherEvents =
          calendarEvents.filter(
            (event) =>
              !event.isStudentClosed &&
              eventContainsDate(
                event,
                date,
              ),
          );

        return {
          date,
          weekend:
            isWeekend(date),
          closedEvent,
          otherEvents,
        };
      },
    );

  return (
    <>
      {/* ===================================================
          PRINT CSS
      =================================================== */}

      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          .screen-only {
            display: none !important;
          }

          .attendance-print-sheet {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .attendance-table {
            width: 100% !important;
            font-size: 7px !important;
          }

          .attendance-table th,
          .attendance-table td {
            padding: 2px 3px !important;
          }

          .student-name {
            min-width: 145px !important;
          }

          .signature-area {
            margin-top: 8mm !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-slate-100 p-4 sm:p-6 print:bg-white print:p-0">

        {/* =================================================
            SCREEN CONTROLS
        ================================================= */}

        <div className="screen-only mx-auto mb-6 max-w-[1600px]">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

            <Link
              href={`/dashboard/teacher/homeroom/${sectionId}`}
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              ? Back to Section
            </Link>

            <PrintButton />

          </div>

          {/* =================================================
              FILTER CARD
          ================================================= */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

            <div className="mb-6">

              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Attendance Register
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Generate a printable attendance
                register for{" "}
                <span className="font-semibold text-slate-700">
                  Grade{" "}
                  {section.grade.level}
                  {section.label}
                </span>
                .
              </p>

            </div>

            <form
              method="GET"
              className="space-y-5"
            >

              {/* Date fields */}

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label
                    htmlFor="from"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    From
                  </label>

                  <input
                    id="from"
                    name="from"
                    type="text"
                    defaultValue={
                      fromValue
                    }
                    placeholder="2018-01-01"
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Ethiopian date:
                    YYYY-MM-DD
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="to"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    To
                  </label>

                  <input
                    id="to"
                    name="to"
                    type="text"
                    defaultValue={
                      toValue
                    }
                    placeholder="2018-01-30"
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Ethiopian date:
                    YYYY-MM-DD
                  </p>
                </div>

              </div>

              {/* Options */}

              <div className="grid gap-3 sm:grid-cols-2">

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">

                  <input
                    type="checkbox"
                    name="includeWeekends"
                    value="1"
                    defaultChecked={
                      includeWeekends
                    }
                    className="h-4 w-4 accent-[#0f2a47]"
                  />

                  <span>
                    Include weekends
                  </span>

                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">

                  <input
                    type="checkbox"
                    name="includeClosed"
                    value="1"
                    defaultChecked={
                      includeClosed
                    }
                    className="h-4 w-4 accent-[#0f2a47]"
                  />

                  <span>
                    Include school-closed days
                  </span>

                </label>

              </div>

              {/* Generate */}

              <div className="flex justify-end">

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#0f2a47] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2037] sm:w-auto"
                >
                  Generate Register
                </button>

              </div>

            </form>

            {/* =================================================
                DYNAMIC REGISTER STATISTICS
            ================================================= */}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              {/* Register days */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Register Days
                </p>

                <div className="mt-1 flex items-end gap-2">

                  <span className="text-2xl font-black text-[#0f2a47]">
                    {dates.length}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-slate-500">
                    school days
                  </span>

                </div>

              </div>

              {/* Weekend status */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Weekends
                </p>

                <div className="mt-1 flex items-end gap-2">

                  <span className="text-2xl font-black text-slate-800">
                    {includeWeekends
                      ? includedWeekendDays
                      : excludedWeekendDays}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-slate-500">
                    {includeWeekends
                      ? "included"
                      : "excluded"}
                  </span>

                </div>

                <p className="mt-1 text-xs text-slate-400">
                  {weekendDays} weekend day
                  {weekendDays === 1
                    ? ""
                    : "s"} in range
                </p>

              </div>

              {/* Closed status */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  School-Closed Days
                </p>

                <div className="mt-1 flex items-end gap-2">

                  <span className="text-2xl font-black text-slate-800">
                    {includeClosed
                      ? includedClosedDays
                      : excludedClosedDays}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-slate-500">
                    {includeClosed
                      ? "included"
                      : "excluded"}
                  </span>

                </div>

                <p className="mt-1 text-xs text-slate-400">
                  {closedDays} closed day
                  {closedDays === 1
                    ? ""
                    : "s"} in range
                </p>

              </div>

            </div>

            {/* Dynamic status summary */}

            <div className="mt-4 flex flex-wrap gap-2">

              <span className="rounded-full bg-[#0f2a47]/10 px-3 py-1.5 text-xs font-bold text-[#0f2a47]">
                {dates.length} register days
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {includeWeekends
                  ? `${includedWeekendDays} weekends included`
                  : `${excludedWeekendDays} weekends excluded`}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {includeClosed
                  ? `${includedClosedDays} closed days included`
                  : `${excludedClosedDays} closed days excluded`}
              </span>

            </div>

          </div>

        </div>

        {/* =================================================
            PRINTABLE REGISTER
        ================================================= */}

        <div className="attendance-print-sheet mx-auto max-w-[1600px] rounded-xl bg-white p-4 shadow-sm sm:p-6 print:max-w-none print:rounded-none print:p-0 print:shadow-none">

          {/* Header */}

          <div className="mb-4 border-b border-slate-400 pb-3">

            <div className="flex items-end justify-between gap-6">

              <div>

                <h1 className="text-2xl font-black tracking-wide text-slate-900">
                  LEVEL UP ACADEMY
                </h1>

                <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Attendance Register
                </p>

              </div>

              <div className="text-right text-xs text-slate-700">

                <div>
                  <span className="font-bold">
                    Grade:
                  </span>{" "}
                  {section.grade.level}
                  {section.label}
                </div>

                <div>
                  <span className="font-bold">
                    School Year:
                  </span>{" "}
                  {section.schoolYear.label}
                </div>

                <div>
                  <span className="font-bold">
                    Teacher:
                  </span>{" "}
                  ____________________
                </div>

              </div>

            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">

              <span>
                {formatEcDate(
                  rangeStart,
                )}{" "}
                —{" "}
                {formatEcDate(
                  rangeEnd,
                )}
              </span>

              <span className="font-bold text-slate-800">
                {dates.length} register days
              </span>

            </div>

          </div>

          {/* Table */}

          {dates.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="attendance-table w-full border-collapse text-[9px]">

                <thead>

                  <tr>

                    <th
                      className="w-8 border border-slate-400 bg-slate-100 px-1 py-2 text-center"
                    >
                      #
                    </th>

                    <th
                      className="student-name min-w-[190px] border border-slate-400 bg-slate-100 px-2 py-2 text-left"
                    >
                      Student Name
                    </th>

                    <th
                      className="w-12 border border-slate-400 bg-slate-100 px-1 py-2 text-center"
                    >
                      ID
                    </th>

                    {dayInfo.map(
                      ({
                        date,
                        weekend,
                        closedEvent,
                      }) => {

                        const ec =
                          gregorianToEthiopian(
                            date,
                          );

                        return (
                          <th
                            key={dateKey(
                              date,
                            )}
                            className={`min-w-[30px] border border-slate-400 px-1 py-1.5 text-center ${
                              closedEvent
                                ? "bg-red-100"
                                : weekend
                                  ? "bg-slate-200"
                                  : "bg-slate-100"
                            }`}
                            title={
                              closedEvent
                                ? closedEvent.title
                                : weekend
                                  ? "Weekend"
                                  : undefined
                            }
                          >

                            <div className="font-bold">
                              {ec.day}
                            </div>

                            <div className="text-[6px] text-slate-500">
                              {ec.month}
                            </div>

                          </th>
                        );
                      },
                    )}

                    <th className="w-8 border border-slate-400 bg-green-50 px-1 py-2 text-center">
                      P
                    </th>

                    <th className="w-8 border border-slate-400 bg-red-50 px-1 py-2 text-center">
                      A
                    </th>

                    <th className="w-8 border border-slate-400 bg-yellow-50 px-1 py-2 text-center">
                      L
                    </th>

                    <th className="w-8 border border-slate-400 bg-blue-50 px-1 py-2 text-center">
                      G
                    </th>

                  </tr>

                  <tr>

                    <th className="border border-slate-400 bg-slate-100" />
                    <th className="border border-slate-400 bg-slate-100" />
                    <th className="border border-slate-400 bg-slate-100" />

                    {dayInfo.map(
                      ({
                        date,
                        weekend,
                        closedEvent,
                      }) => (
                        <th
                          key={`label-${dateKey(
                            date,
                          )}`}
                          className={`border border-slate-400 px-1 py-0.5 text-center text-[6px] ${
                            closedEvent
                              ? "bg-red-100 text-red-700"
                              : weekend
                                ? "bg-slate-200 text-slate-500"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {closedEvent
                            ? "OFF"
                            : weekend
                              ? "WE"
                              : ""}
                        </th>
                      ),
                    )}

                    <th className="border border-slate-400 bg-green-50" />
                    <th className="border border-slate-400 bg-red-50" />
                    <th className="border border-slate-400 bg-yellow-50" />
                    <th className="border border-slate-400 bg-blue-50" />

                  </tr>

                </thead>

                <tbody>

                  {section.enrollments.map(
                    (
                      enrollment,
                      index,
                    ) => {

                      const student =
                        enrollment.student;

                      let present = 0;
                      let absent = 0;
                      let late = 0;
                      let permission = 0;

                      return (
                        <tr
                          key={
                            student.id
                          }
                        >

                          <td className="border border-slate-400 px-1 py-2 text-center font-semibold">
                            {index + 1}
                          </td>

                          <td className="border border-slate-400 px-2 py-2">

                            <div className="font-semibold leading-tight">
                              {
                                student.fullName
                              }
                            </div>

                            <div className="mt-0.5 font-mono text-[7px] text-slate-400">
                              {
                                student.studentLoginId
                              }
                            </div>

                          </td>

                          <td className="border border-slate-400 px-1 py-2 text-center text-[7px]">
                            {student.studentLoginId.slice(
                              -4,
                            )}
                          </td>

                          {dayInfo.map(
                            ({
                              date,
                              weekend,
                              closedEvent,
                              otherEvents,
                            }) => {

                              const key =
                                `${student.id}_${dateKey(
                                  date,
                                )}`;

                              const record =
                                recordMap.get(
                                  key,
                                );

                              if (
                                record?.status ===
                                "PRESENT"
                              ) {
                                present++;
                              }

                              if (
                                record?.status ===
                                "ABSENT"
                              ) {
                                absent++;
                              }

                              if (
                                record?.status ===
                                "LATE"
                              ) {
                                late++;
                              }

                              if (
                                record?.status ===
                                "PERMISSION_GIVEN"
                              ) {
                                permission++;
                              }

                              let value =
                                statusLetter(
                                  record?.status,
                                );

                              if (
                                closedEvent
                              ) {
                                value =
                                  "OFF";
                              } else if (
                                weekend
                              ) {
                                value =
                                  "WE";
                              }

                              return (
                                <td
                                  key={dateKey(
                                    date,
                                  )}
                                  className={`border border-slate-400 px-1 py-2 text-center font-bold ${
                                    closedEvent
                                      ? "bg-red-50 text-red-600"
                                      : weekend
                                        ? "bg-slate-50 text-slate-400"
                                        : ""
                                  }`}
                                  title={
                                    closedEvent
                                      ? closedEvent.title
                                      : otherEvents.length >
                                          0
                                        ? otherEvents
                                            .map(
                                              (
                                                event,
                                              ) =>
                                                event.title,
                                            )
                                            .join(
                                              ", ",
                                            )
                                        : record
                                          ? statusLabel(
                                              record.status,
                                            )
                                          : undefined
                                  }
                                >
                                  {value}
                                </td>
                              );
                            },
                          )}

                          <td className="border border-slate-400 bg-green-50 px-1 py-2 text-center font-bold">
                            {present}
                          </td>

                          <td className="border border-slate-400 bg-red-50 px-1 py-2 text-center font-bold">
                            {absent}
                          </td>

                          <td className="border border-slate-400 bg-yellow-50 px-1 py-2 text-center font-bold">
                            {late}
                          </td>

                          <td className="border border-slate-400 bg-blue-50 px-1 py-2 text-center font-bold">
                            {permission}
                          </td>

                        </tr>
                      );
                    },
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center text-sm text-yellow-800">
              No dates are included in this
              register. Try including weekends or
              school-closed days, or select a
              different date range.
            </div>
          )}

          {/* Legend */}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-300 pt-2 text-[9px] text-slate-600">

            <span>
              <strong>P</strong> =
              Present
            </span>

            <span>
              <strong>A</strong> =
              Absent
            </span>

            <span>
              <strong>L</strong> =
              Late
            </span>

            <span>
              <strong>G</strong> =
              Permission
            </span>

            <span>
              <strong>WE</strong> =
              Weekend
            </span>

            <span>
              <strong>OFF</strong> =
              School Closed
            </span>

          </div>

          {/* Dynamic range summary */}

          <div className="screen-only mt-4 flex flex-wrap gap-2 text-xs">

            <span className="rounded-full bg-[#0f2a47]/10 px-3 py-1.5 font-bold text-[#0f2a47]">
              {dates.length} register days
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
              {includeWeekends
                ? `${includedWeekendDays} weekends included`
                : `${excludedWeekendDays} weekends excluded`}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
              {includeClosed
                ? `${includedClosedDays} closed days included`
                : `${excludedClosedDays} closed days excluded`}
            </span>

          </div>

          {/* Signatures */}

          <div className="signature-area mt-10 grid grid-cols-2 gap-20 text-[9px]">

            <div className="border-t border-slate-400 pt-1.5">
              Homeroom Teacher Signature
            </div>

            <div className="border-t border-slate-400 pt-1.5">
              School Administration
            </div>

          </div>

          {!validRange && (
            <div className="screen-only mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              The supplied Ethiopian date range
              was invalid, so the current
              Ethiopian month was loaded instead.
            </div>
          )}

        </div>
      </div>
    </>
  );
}

