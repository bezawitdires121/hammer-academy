"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttendance } from "../../actions";
import EthiopianAttendanceDatePicker from "./EthiopianAttendanceDatePicker";

type Student = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  studentLoginId: string;
};

type ExistingRecord = {
  studentId: string;
  status: string;
  reason: string | null;
};

type PeriodOption = {
  id: string;
  name: string;
  number: number;
  isCurrent: boolean;
  isLocked: boolean;
};

type SchoolYearOption = {
  id: string;
  label: string;
  isCurrent: boolean;
};

type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  isStudentClosed: boolean;
  note: string | null;
};

type Props = {
  sectionId: string;
  selectedDate: string;
  students: Student[];
  existingRecords: ExistingRecord[];
  selectedSchoolYearId: string;
  semesters: PeriodOption[];
  selectedSemesterId: string;
  isLocked: boolean;
  calendarEvents: CalendarEvent[];
  semesterStart: string;
  semesterEnd: string;
};

const statuses = [
  {
    value: "PRESENT",
    label: "Present",
    active: "border-green-600 bg-green-600 text-white",
  },
  {
    value: "ABSENT",
    label: "Absent",
    active: "border-red-600 bg-red-600 text-white",
  },
  {
    value: "LATE",
    label: "Late",
    active: "border-orange-500 bg-orange-500 text-white",
  },
  {
    value: "PERMISSION_GIVEN",
    label: "Permission",
    active: "border-blue-600 bg-blue-600 text-white",
  },
];

export default function AttendanceForm({
  sectionId,
  selectedDate,
  students,
  existingRecords,
selectedSchoolYearId,
  semesters,
  selectedSemesterId,
  isLocked,
  calendarEvents,
  semesterStart,
  semesterEnd,
}: Props) {
  const router = useRouter();

  const existing = new Map(
    existingRecords.map((record) => [
      record.studentId,
      record,
    ]),
  );

  /*
   * The server only accepts attendance dates that fall inside
   * the selected semester.
   *
   * selectedDate can be stale when the user changes semester
   * or when the page was opened with today's date even though
   * today's date is outside the selected semester.
   *
   * Always normalize the initial form date to the actual
   * database semester boundaries.
   */
  function normalizeDateInsideSemester(
    value: string,
    start: string,
    end: string,
  ) {
    const dateValue = value?.slice(0, 10) ?? "";
    const startValue = start?.slice(0, 10) ?? "";
    const endValue = end?.slice(0, 10) ?? "";

    if (!startValue || !endValue) {
      return dateValue;
    }

    if (!dateValue) {
      return startValue;
    }

    if (dateValue < startValue) {
      return startValue;
    }

    if (dateValue > endValue) {
      return endValue;
    }

    return dateValue;
  }

  const initialDate = normalizeDateInsideSemester(
    selectedDate,
    semesterStart,
    semesterEnd,
  );

  const [date, setDate] = useState(initialDate);

  const [statusesState, setStatusesState] =
    useState<Record<string, string>>(() => {
      const initial: Record<string, string> = {};

      for (const student of students) {
        initial[student.id] =
          existing.get(student.id)?.status ?? "";
      }

      return initial;
    });

  const [reasonsState, setReasonsState] =
    useState<Record<string, string>>(() => {
      const initial: Record<string, string> = {};

      for (const student of students) {
        initial[student.id] =
          existing.get(student.id)?.reason ?? "";
      }

      return initial;
    });

  const [saving, setSaving] =
    useState(false);

  const [toast, setToast] =
    useState<{
      type: "success" | "error";
      message: string;
    } | null>(null);

  function changeDate(nextDate: string) {
    setDate(nextDate);

    if (!nextDate) return;

    const query = new URLSearchParams();

    query.set("schoolYearId", selectedSchoolYearId);
    query.set("semesterId", selectedSemesterId);
    query.set("date", nextDate);

    router.push(
      `/dashboard/teacher/homeroom/${sectionId}/attendance?${query.toString()}`,
    );
  }

  function changePeriod(
    schoolYearId: string,
    semesterId: string,
  ) {
    const query =
      new URLSearchParams();

    query.set(
      "schoolYearId",
      schoolYearId,
    );

    query.set(
      "semesterId",
      semesterId,
    );

    router.push(
      `/dashboard/teacher/homeroom/${sectionId}/attendance?${query.toString()}`,
    );
  }

  function setAll(
    status: string,
  ) {
    const next: Record<
      string,
      string
    > = {};

    for (const student of students) {
      next[student.id] =
        status;
    }

    setStatusesState(next);
  }

  const presentCount =
    students.filter(
      (student) =>
        statusesState[
          student.id
        ] === "PRESENT",
    ).length;

  const absentCount =
    students.filter(
      (student) =>
        statusesState[
          student.id
        ] === "ABSENT",
    ).length;

  const lateCount =
    students.filter(
      (student) =>
        statusesState[
          student.id
        ] === "LATE",
    ).length;

  const permissionCount =
    students.filter(
      (student) =>
        statusesState[
          student.id
        ] ===
        "PERMISSION_GIVEN",
    ).length;

  return (
    <form
      action={async (formData) => {
        setSaving(true);
        setToast(null);

        try {
          await saveAttendance(formData);

          setToast({
            type: "success",
            message: "Attendance saved successfully.",
          });

          router.refresh();
        } catch (error) {
          console.error(error);

          setToast({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to save attendance.",
          });
        } finally {
          setSaving(false);
        }
      }}

      className="space-y-5"
    >
      {toast && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      <input
        type="hidden"
        name="sectionId"
        value={sectionId}
      />

      <input
        type="hidden"
        name="date"
        value={date}
      />

      <input
        type="hidden"
        name="schoolYearId"
        value={
          selectedSchoolYearId
        }
      />

      <input
        type="hidden"
        name="semesterId"
        value={
          selectedSemesterId
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Semester
            </label>

            <select
              value={
                selectedSemesterId
              }
              onChange={(event) =>
                changePeriod(
                  selectedSchoolYearId,
                  event.target.value,
                )
              }
              disabled={isLocked}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
            >
              {semesters.map(
                (semester) => (
                  <option
                    key={semester.id}
                    value={semester.id}
                  >
                    {semester.name}
                    {semester.isCurrent
                      ? " — Current"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Attendance Date
          </label>

          <div className="mt-2">
            <EthiopianAttendanceDatePicker
              value={date}
              onChange={changeDate}
              disabled={isLocked}
              events={
                calendarEvents
              }
              schoolYearId={
                selectedSchoolYearId
              }
              semesterStart={
                semesterStart
              }
              semesterEnd={
                semesterEnd
              }
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setAll("PRESENT")
            }
            disabled={isLocked}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
          >
            Mark All Present
          </button>

          <button
            type="button"
            onClick={() =>
              setAll("ABSENT")
            }
            disabled={isLocked}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Mark All Absent
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold text-green-700">
            Present
          </p>
          <p className="mt-1 text-2xl font-bold text-green-800">
            {presentCount}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">
            Absent
          </p>
          <p className="mt-1 text-2xl font-bold text-red-800">
            {absentCount}
          </p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-semibold text-orange-700">
            Late
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-800">
            {lateCount}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-700">
            Permission
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-800">
            {permissionCount}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="font-bold text-slate-900">
            Students
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {students.length} active students
          </p>
        </div>

        <div className="space-y-4">
          {students.map(
            (student, index) => (
              <div
                key={student.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                        {index + 1}
                      </span>

                      {student.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-bold text-slate-900">
                          {
                            student.fullName
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          {
                            student.studentLoginId
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {statuses.map(
                      (status) => {
                        const active =
                          statusesState[
                            student.id
                          ] ===
                          status.value;

                        return (
                          <button
                            key={
                              status.value
                            }
                            type="button"
                            disabled={isLocked}
                            onClick={() =>
                              setStatusesState(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [student.id]:
                                    status.value,
                                }),
                              )
                            }
                            className={[
                              "rounded-lg border px-3 py-2 text-sm font-bold",
                              active
                                ? status.active
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                            ].join(
                              " ",
                            )}
                          >
                            {
                              status.label
                            }
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Reason (optional)
                  </label>

                  <input
                    type="text"
                    value={
                      reasonsState[
                        student.id
                      ] ?? ""
                    }
                    disabled={isLocked}
                    onChange={(
                      event,
                    ) =>
                      setReasonsState(
                        (
                          current,
                        ) => ({
                          ...current,
                          [student.id]:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Optional reason"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />

                  <input
                    type="hidden"
                    name={`reason_${student.id}`}
                    value={
                      reasonsState[
                        student.id
                      ] ?? ""
                    }
                  />

                  <input
                    type="hidden"
                    name={`attendance_${student.id}`}
                    value={
                      statusesState[
                        student.id
                      ] ?? ""
                    }
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || isLocked}
          className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Attendance"}
        </button>
      </div>
    </form>
  );
}








