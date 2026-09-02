import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ethiopianToGregorian } from "@/lib/ethiopian-calendar";
import AttendanceForm from "./AttendanceForm";

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ date?: string; schoolYearId?: string; semesterId?: string }>;
}) {
  const session = await requireTeacher();
  const attendanceParams = await searchParams;

  const requestedSchoolYearId = attendanceParams.schoolYearId ?? "";

  const requestedSemesterId =
    attendanceParams.semesterId ?? "";

  const { sectionId } = await params;
  const { date } = await searchParams;

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!teacher) {
    notFound();
  }

  const section = await prisma.section.findUnique({
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

  if (section.homeroomTeacherId !== teacher.id) {
    notFound();
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
    },
  });

  const currentSchoolYear =
    schoolYears.find((year) => year.isCurrent) ??
    schoolYears[0] ??
    null;

  const selectedSchoolYear = schoolYears.find((year) => year.id === section.schoolYearId);

  if (!selectedSchoolYear) {
    throw new Error("No school year is configured.");
  }

  const semesters = await prisma.semester.findMany({
    where: {
      schoolYearId: selectedSchoolYear.id,
    },
    orderBy: {
      number: "asc",
    },
    select: {
      id: true,
      name: true,
      number: true,
      isCurrent: true,
      isLocked: true,
      startDate: true,
      endDate: true,
    },
  });

  const selectedSemester =
    semesters.find(
      (semester) => semester.id === requestedSemesterId,
    ) ??
    semesters.find((semester) => semester.isCurrent) ??
    semesters.find((semester) => semester.number === 1) ??
    semesters[0] ??
    null;

  if (!selectedSemester) {
    throw new Error(
      "No semester is configured for the selected school year.",
    );
  }

  /*
   * Semester dates are defined in the Ethiopian calendar.
   *
   * Semester 1:
   *   Meskerem 1 through Tir 30
   *
   * Semester 2:
   *   Yekatit 1 through Sene 30
   *
   * Convert those Ethiopian dates through the shared
   * lib/ethiopian-calendar.ts helper so the attendance
   * page uses exactly the same calendar system as Admin.
   */
  /*
   * Semester dates come directly from the selected
   * Semester record in the database.
   *
   * Admin configures these dates in the School Years
   * manager, so Attendance must use those exact dates.
   */
  const semesterStart = selectedSemester.startDate;

  const semesterEnd = new Date(
    selectedSemester.endDate,
  );

  semesterEnd.setUTCHours(23, 59, 59, 999);
  const today = new Date();

  const selectedDate =
    date ??
    today.toISOString().slice(0, 10);

  const dateObject = new Date(
    `${selectedDate}T00:00:00.000Z`,
  );
const calendarEvents = await prisma.schoolCalendarEvent.findMany({
    where: {
      schoolYearId: selectedSchoolYear.id,
      startDate: {
        lte: semesterEnd,
      },
      endDate: {
        gte: semesterStart,
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      startDate: true,
      endDate: true,
      isStudentClosed: true,
      note: true,
    },
    orderBy: {
      startDate: "asc",
    },
  });

  const existingRecords =
    await prisma.attendance.findMany({
      where: {
          section: {
            schoolYearId: selectedSchoolYear.id,
          },
        sectionId,
        date: dateObject,
      },
    });

  const students = section.enrollments.map(
    (enrollment) => enrollment.student,
  );

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/teacher/homeroom/${sectionId}`}
          className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          ← Back to Section
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Attendance
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Grade {section.grade.level}
            {section.label} · {section.schoolYear.label} ·
            Homeroom attendance
          </p>
        </div>
      </div>

      {/* Daily attendance */}
      <AttendanceForm
            selectedSchoolYearId={selectedSchoolYear.id}
            semesters={semesters}
            selectedSemesterId={selectedSemester.id}
            isLocked={selectedSemester.isLocked}
        calendarEvents={calendarEvents.map((event) => ({
          id: event.id,
          title: event.title,
          type: event.type,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          isStudentClosed: event.isStudentClosed,
          note: event.note,
        }))}
        semesterStart={semesterStart.toISOString()}
        semesterEnd={semesterEnd.toISOString()}
            sectionId={sectionId}
        selectedDate={selectedDate}
        students={students.map((student) => ({
          id: student.id,
          fullName: student.fullName,
          photoUrl: student.photoUrl ?? null,
          studentLoginId: student.studentLoginId,
        }))}
        existingRecords={existingRecords.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          reason: record.reason,
        }))}
      />

      {/* Attendance Register */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Attendance Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Open the attendance register for this
              homeroom.
            </p>
          </div>

          {selectedSemester.isLocked ? (
            <span
              title="This semester is locked."
              className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-500 shadow-sm"
            >
              Open Attendance Register
            </span>
          ) : (
            <Link
              href={`/dashboard/teacher/homeroom/${sectionId}/attendance-sheet`}
              className="inline-flex items-center justify-center rounded-xl bg-[#0f2a47] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2037]"
            >
              Open Attendance Register
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}











