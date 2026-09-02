"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "./actions";
import {
  dateKey,
  daysInEthiopianMonth,
  ecKey,
  ethiopianToGregorian,
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/lib/ethiopian-calendar";

type EventType =
  | "PUBLIC_HOLIDAY"
  | "SCHOOL_HOLIDAY"
  | "TEACHER_TRAINING"
  | "EXAM_DAY"
  | "EMERGENCY_CLOSURE"
  | "OTHER";

type EventItem = {
  id: string;
  title: string;
  type: EventType;
  startDate: string;
  endDate: string;
  isStudentClosed: boolean;
  note: string | null;
  schoolYear: {
    id: string;
    label: string;
  };
};

type SchoolYear = {
  id: string;
  label: string;
  isCurrent: boolean;
};

const EVENT_TYPES: {
  value: EventType;
  label: string;
}[] = [
  {
    value: "PUBLIC_HOLIDAY",
    label: "Public Holiday",
  },
  {
    value: "SCHOOL_HOLIDAY",
    label: "School Holiday",
  },
  {
    value: "TEACHER_TRAINING",
    label: "Teacher Training",
  },
  {
    value: "EXAM_DAY",
    label: "Exam Day",
  },
  {
    value: "EMERGENCY_CLOSURE",
    label: "Emergency Closure",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const EC_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumen",
];

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const EVENT_STYLES: Record<
  EventType,
  {
    bg: string;
    text: string;
    dot: string;
  }
> = {
  PUBLIC_HOLIDAY: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  SCHOOL_HOLIDAY: {
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  TEACHER_TRAINING: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-600",
  },
  EXAM_DAY: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  EMERGENCY_CLOSURE: {
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-700",
  },
  OTHER: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
  },
};
function formatCalendarDate(value: string) {
  return formatEthiopianDate(new Date(value));
}

function buildFormData(data: {
  id?: string;
  title: string;
  type: EventType;
  schoolYearId: string;
  startDate: string;
  endDate: string;
  isStudentClosed: boolean;
  note: string;
}) {
  const formData = new FormData();

  if (data.id) {
    formData.set("id", data.id);
  }

  formData.set("title", data.title);
  formData.set("type", data.type);
  formData.set("schoolYearId", data.schoolYearId);
  formData.set("startDate", data.startDate);
  formData.set("endDate", data.endDate);
  formData.set(
    "isStudentClosed",
    String(data.isStudentClosed),
  );
  formData.set("note", data.note);

  return formData;
}

function eventContainsDate(
  event: EventItem,
  date: Date,
) {
  const target = dateKey(date);

  return (
    target >= event.startDate.slice(0, 10) &&
    target <= event.endDate.slice(0, 10)
  );
}

export default function CalendarManager({
  initialEvents = [],
  schoolYears = [],
}: {
  initialEvents?: EventItem[];
  schoolYears?: SchoolYear[];
}) {
  const router = useRouter();

  const [events, setEvents] =
    useState<EventItem[]>(initialEvents);

  const currentEc = gregorianToEthiopian(new Date());

  const firstYear =
    Number(
      schoolYears[0]?.label?.match(/\d{4}/)?.[0],
    ) || currentEc.year;

  const [calendarYear, setCalendarYear] =
    useState(firstYear);

  const [calendarMonth, setCalendarMonth] =
    useState(
      currentEc.year === firstYear
        ? currentEc.month
        : 1,
    );

  const [showForm, setShowForm] =
    useState(false);

  const [editing, setEditing] =
    useState<EventItem | null>(null);

  const [title, setTitle] = useState("");

  const [type, setType] =
    useState<EventType>("PUBLIC_HOLIDAY");

  const [schoolYearId, setSchoolYearId] =
    useState(schoolYears[0]?.id ?? "");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [isStudentClosed, setIsStudentClosed] =
    useState(true);

  const [note, setNote] = useState("");

  const [saving, setSaving] =
    useState(false);

  const selectedSchoolYear =
    schoolYears.find(
      (year) => year.id === schoolYearId,
    );

  /*
   * Calculate the exact Gregorian range represented
   * by the currently visible Ethiopian month.
   */
  const visibleEvents = useMemo(() => {
    const firstDate = ethiopianToGregorian(
      calendarYear,
      calendarMonth,
      1,
    );

    const lastDay = daysInEthiopianMonth(
      calendarYear,
      calendarMonth,
    );

    const lastDate = ethiopianToGregorian(
      calendarYear,
      calendarMonth,
      lastDay,
    );

    if (!firstDate || !lastDate) {
      return [];
    }

    const firstKey = dateKey(firstDate);
    const lastKey = dateKey(lastDate);

    return events.filter((event) => {
      if (
        event.schoolYear.id !== schoolYearId
      ) {
        return false;
      }

      const eventStart =
        event.startDate.slice(0, 10);

      const eventEnd =
        event.endDate.slice(0, 10);

      return (
        eventStart <= lastKey &&
        eventEnd >= firstKey
      );
    });
  }, [
    events,
    schoolYearId,
    calendarYear,
    calendarMonth,
  ]);

  const calendarDays = useMemo(() => {
    const daysInMonth =
      daysInEthiopianMonth(
        calendarYear,
        calendarMonth,
      );

    const firstGregorian =
      ethiopianToGregorian(
        calendarYear,
        calendarMonth,
        1,
      );

    if (!firstGregorian) {
      return [];
    }

    const jsDay =
      firstGregorian.getUTCDay();

    /*
     * JavaScript:
     * Sunday = 0
     * Monday = 1
     *
     * Our calendar starts Monday.
     */
    const mondayIndex =
      jsDay === 0 ? 6 : jsDay - 1;

    const cells: (
      | {
          type: "empty";
        }
      | {
          type: "day";
          day: number;
          date: Date;
        }
    )[] = [];

    for (
      let i = 0;
      i < mondayIndex;
      i++
    ) {
      cells.push({
        type: "empty",
      });
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const date =
        ethiopianToGregorian(
          calendarYear,
          calendarMonth,
          day,
        );

      if (!date) continue;

      cells.push({
        type: "day",
        day,
        date,
      });
    }

    return cells;
  }, [
    calendarYear,
    calendarMonth,
  ]);

  function resetForm() {
    setTitle("");
    setType("PUBLIC_HOLIDAY");

    setSchoolYearId(
      selectedSchoolYear?.id ??
        schoolYears[0]?.id ??
        "",
    );

    setStartDate("");
    setEndDate("");
    setIsStudentClosed(true);
    setNote("");
    setEditing(null);
    setShowForm(false);
  }

  function openForDate(
    year: number,
    month: number,
    day: number,
  ) {
    setEditing(null);
    setTitle("");
    setType("PUBLIC_HOLIDAY");

    const yearObject =
      schoolYears.find((item) => {
        const numeric = Number(
          item.label.match(/\d{4}/)?.[0],
        );

        return numeric === year;
      }) ?? selectedSchoolYear ?? schoolYears[0];

    setSchoolYearId(
      yearObject?.id ?? "",
    );

    const value = ecKey(
      year,
      month,
      day,
    );

    setStartDate(value);
    setEndDate(value);
    setIsStudentClosed(true);
    setNote("");
    setShowForm(true);
  }

  function editEvent(
    event: EventItem,
  ) {
    setEditing(event);
    setTitle(event.title);
    setType(event.type);

    setSchoolYearId(
      event.schoolYear.id,
    );

    const startEc =
      gregorianToEthiopian(
        new Date(event.startDate),
      );

    const endEc =
      gregorianToEthiopian(
        new Date(event.endDate),
      );

    setStartDate(
      ecKey(
        startEc.year,
        startEc.month,
        startEc.day,
      ),
    );

    setEndDate(
      ecKey(
        endEc.year,
        endEc.month,
        endEc.day,
      ),
    );

    setIsStudentClosed(
      event.isStudentClosed,
    );

    setNote(event.note ?? "");
    setShowForm(true);
  }

  function moveMonth(
    direction: -1 | 1,
  ) {
    if (direction === 1) {
      if (calendarMonth === 13) {
        setCalendarMonth(1);
        setCalendarYear(
          (year) => year + 1,
        );
      } else {
        setCalendarMonth(
          (month) => month + 1,
        );
      }

      return;
    }

    if (calendarMonth === 1) {
      setCalendarMonth(13);
      setCalendarYear(
        (year) => year - 1,
      );
    } else {
      setCalendarMonth(
        (month) => month - 1,
      );
    }
  }

  async function save() {
    if (
      !title.trim() ||
      !schoolYearId ||
      !startDate ||
      !endDate
    ) {
      alert(
        "Please complete all required fields.",
      );
      return;
    }

    if (endDate < startDate) {
      alert(
        "End date cannot be before start date.",
      );
      return;
    }

    setSaving(true);

    try {
      const formData =
        buildFormData({
          id: editing?.id,
          title: title.trim(),
          type,
          schoolYearId,
          startDate,
          endDate,
          isStudentClosed,
          note: note.trim(),
        });

      const savedEvent = editing
        ? await updateCalendarEvent(
            formData,
          )
        : await createCalendarEvent(
            formData,
          );

      const event =
        savedEvent as EventItem;

      if (editing) {
        setEvents((current) =>
          current.map((item) =>
            item.id === editing.id
              ? event
              : item,
          ),
        );
      } else {
        setEvents((current) => [
          ...current,
          event,
        ]);
      }

      resetForm();
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to save event.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(
    id: string,
  ) {
    if (
      !confirm(
        "Delete this calendar event?",
      )
    ) {
      return;
    }

    try {
      const formData =
        new FormData();

      formData.set("id", id);

      await deleteCalendarEvent(
        formData,
      );

      setEvents((current) =>
        current.filter(
          (event) =>
            event.id !== id,
        ),
      );

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete event.",
      );
    }
  }

  const todayEc =
    gregorianToEthiopian(
      new Date(),
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Ethiopian School Calendar
            </h1>

            {selectedSchoolYear && (
              <span className="rounded-full bg-[#0f2a47] px-3 py-1 text-xs font-bold text-white">
                {selectedSchoolYear.label} E.C.
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Official school dates, holidays,
            closures, examinations, and
            training days.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setTitle("");
            setType("PUBLIC_HOLIDAY");
            setSchoolYearId(
              selectedSchoolYear?.id ??
                schoolYears[0]?.id ??
                "",
            );
            setStartDate("");
            setEndDate("");
            setIsStudentClosed(true);
            setNote("");
            setShowForm(true);
          }}
          className="rounded-lg bg-[#0f2a47] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2037]"
        >
          + Add Event
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                moveMonth(-1)
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-700 hover:bg-slate-50"
              aria-label="Previous month"
            >
              ?
            </button>

            <div className="min-w-[190px] text-center">
              <p className="text-lg font-bold text-slate-900">
                {
                  EC_MONTHS[
                    calendarMonth - 1
                  ]
                }
              </p>

              <p className="text-sm font-medium text-slate-500">
                {calendarYear} E.C.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                moveMonth(1)
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-700 hover:bg-slate-50"
              aria-label="Next month"
            >
              ?
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={schoolYearId}
              onChange={(event) => {
                const id =
                  event.target.value;

                setSchoolYearId(id);

                const year =
                  schoolYears.find(
                    (item) =>
                      item.id === id,
                  );

                const numeric = Number(
                  year?.label.match(
                    /\d{4}/,
                  )?.[0],
                );

                if (numeric) {
                  setCalendarYear(
                    numeric,
                  );

                  setCalendarMonth(1);
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#0f2a47]"
            >
              {schoolYears.map(
                (year) => (
                  <option
                    key={year.id}
                    value={year.id}
                  >
                    {year.label} E.C.
                    {year.isCurrent
                      ? " ï¿½ Current"
                      : ""}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={() => {
                setCalendarYear(
                  currentEc.year,
                );

                setCalendarMonth(
                  currentEc.month,
                );

                const currentYear =
                  schoolYears.find(
                    (year) =>
                      Number(
                        year.label.match(
                          /\d{4}/,
                        )?.[0],
                      ) ===
                      currentEc.year,
                  );

                if (currentYear) {
                  setSchoolYearId(
                    currentYear.id,
                  );
                }
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map(
          (eventType) => {
            const style =
              EVENT_STYLES[
                eventType.value
              ];

            return (
              <div
                key={eventType.value}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${style.bg} ${style.text}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${style.dot}`}
                />

                {eventType.label}
              </div>
            );
          },
        )}

        <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
          <span className="h-2 w-2 rounded-full bg-red-600" />
          Students Off
        </div>
      </div>

      {/* Ethiopian Calendar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS.map(
            (day, index) => (
              <div
                key={day}
                className={`px-2 py-3 text-center text-xs font-bold uppercase tracking-wide ${
                  index >= 5
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
              >
                {day.slice(0, 3)}
              </div>
            ),
          )}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map(
            (cell, index) => {
              if (
                cell.type ===
                "empty"
              ) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[145px] border-b border-r border-slate-100 bg-slate-50/40"
                  />
                );
              }

              const {
                day,
                date,
              } = cell;

              const currentEvents =
                visibleEvents.filter(
                  (event) =>
                    eventContainsDate(
                      event,
                      date,
                    ),
                );

              const isToday =
                todayEc.year ===
                  calendarYear &&
                todayEc.month ===
                  calendarMonth &&
                todayEc.day === day;

              const weekday =
                date.getUTCDay();

              const isWeekend =
                weekday === 0 ||
                weekday === 6;

              const closedEvent =
                currentEvents.find(
                  (event) =>
                    event.isStudentClosed,
                );

              return (
                <button
                  key={ecKey(
                    calendarYear,
                    calendarMonth,
                    day,
                  )}
                  type="button"
                  onClick={() =>
                    openForDate(
                      calendarYear,
                      calendarMonth,
                      day,
                    )
                  }
                  className={`group min-h-[145px] border-b border-r border-slate-100 p-2 text-left align-top transition hover:bg-slate-50 ${
                    isWeekend
                      ? "bg-slate-50/70"
                      : "bg-white"
                  } ${
                    closedEvent
                      ? "bg-red-50/50"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        isToday
                          ? "bg-[#0f2a47] text-white ring-4 ring-blue-50"
                          : isWeekend
                            ? "text-slate-400"
                            : "text-slate-800"
                      }`}
                    >
                      {day}
                    </span>

                    {closedEvent && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                        Off
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    {formatEthiopianDate(
                      date,
                    )}
                  </p>

                  <div className="mt-2 space-y-1">
                    {currentEvents
                      .slice(0, 3)
                      .map(
                        (event) => {
                          const style =
                            EVENT_STYLES[
                              event.type
                            ];

                          return (
                            <div
                              key={
                                event.id
                              }
                              onClick={(
                                e,
                              ) => {
                                e.stopPropagation();
                                editEvent(
                                  event,
                                );
                              }}
                              className={`rounded-md px-2 py-1.5 ${style.bg} ${style.text}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                                />

                                <span className="truncate text-[10px] font-bold">
                                  {
                                    event.title
                                  }
                                </span>
                              </div>
                            </div>
                          );
                        },
                      )}

                    {currentEvents.length >
                      3 && (
                      <p className="px-1 text-[10px] font-semibold text-slate-400">
                        +
                        {currentEvents.length -
                          3}{" "}
                        more
                      </p>
                    )}
                  </div>

                  <div className="mt-2 hidden text-[10px] font-semibold text-slate-300 group-hover:block">
                    + Add event
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Event Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editing
                    ? "Edit Calendar Event"
                    : "Add Calendar Event"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add an official event to
                  the Ethiopian school
                  calendar.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  resetForm
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                Event Name *
                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ethiopian New Year"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-[#0f2a47]"
                />
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                Event Type *
                <select
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target
                        .value as EventType,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#0f2a47]"
                >
                  {EVENT_TYPES.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                School Year *
                <select
                  value={
                    schoolYearId
                  }
                  onChange={(
                    event,
                  ) =>
                    setSchoolYearId(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#0f2a47]"
                >
                  {schoolYears.map(
                    (year) => (
                      <option
                        key={
                          year.id
                        }
                        value={
                          year.id
                        }
                      >
                        {year.label}{" "}
                        E.C.
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div />

              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                Ethiopian Start Date *
                <input
                  type="text"
                  value={
                    startDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setStartDate(
                      event.target
                        .value,
                    )
                  }
                  placeholder="2018-01-01"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-[#0f2a47]"
                />

                <span className="block text-xs font-normal text-slate-400">
                  EC format:
                  YYYY-MM-DD
                </span>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                Ethiopian End Date *
                <input
                  type="text"
                  value={
                    endDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setEndDate(
                      event.target
                        .value,
                    )
                  }
                  placeholder="2018-01-01"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-[#0f2a47]"
                />

                <span className="block text-xs font-normal text-slate-400">
                  Same date for
                  a one-day
                  event.
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 md:col-span-2">
                <input
                  type="checkbox"
                  checked={
                    isStudentClosed
                  }
                  onChange={(
                    event,
                  ) =>
                    setIsStudentClosed(
                      event.target
                        .checked,
                    )
                  }
                  className="h-5 w-5 accent-red-600"
                />

                <div>
                  <p className="text-sm font-bold text-red-800">
                    Students are
                    officially off
                  </p>

                  <p className="mt-0.5 text-xs text-red-600">
                    Attendance
                    will later
                    use this
                    setting to
                    skip this
                    date
                    automatically.
                  </p>
                </div>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-slate-700 md:col-span-2">
                Note

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  placeholder="Optional details..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-[#0f2a47]"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={
                  resetForm
                }
                disabled={
                  saving
                }
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={save}
                className="rounded-lg bg-[#0f2a47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b2037] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Add Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


