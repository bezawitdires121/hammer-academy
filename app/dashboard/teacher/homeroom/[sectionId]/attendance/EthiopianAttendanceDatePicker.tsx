"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import {
  dateKey,
  daysInEthiopianMonth,
  ecKey,
  ethiopianToGregorian,
  gregorianToEthiopian,
} from "@/lib/ethiopian-calendar";

type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  startDate: string | Date;
  endDate: string | Date;
  isStudentClosed: boolean;
  note: string | null;
};

const MONTHS = [
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
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

function containsDate(event: CalendarEvent, date: Date) {
  const target = dateKey(date);
  const start = dateKey(new Date(event.startDate));
  const end = dateKey(new Date(event.endDate));

  return target >= start && target <= end;
}

export default function EthiopianAttendanceDatePicker({
  value,
  onChange,
  events = [],
  schoolYearId,
  semesterStart,
  semesterEnd,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  events?: CalendarEvent[];
  schoolYearId?: string;
  semesterStart?: string | null;
  semesterEnd?: string | null;
  disabled?: boolean;
}) {
  const initialDate = useMemo(() => {
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return gregorianToEthiopian(parsed);
      }
    }

    return gregorianToEthiopian(new Date());
  }, [value]);

  const [year, setYear] = useState(initialDate.year);
  const [month, setMonth] = useState(initialDate.month);
  const [open, setOpen] = useState(false);

  const days = useMemo(() => {
    const count = daysInEthiopianMonth(year, month);
    const first = ethiopianToGregorian(year, month, 1);

    if (!first) return [];

    const jsDay = first.getUTCDay();
    const mondayIndex = jsDay === 0 ? 6 : jsDay - 1;

    const cells: Array<
      | { type: "empty"; key: string }
      | { type: "day"; key: string; day: number; date: Date }
    > = [];

    for (let i = 0; i < mondayIndex; i++) {
      cells.push({
        type: "empty",
        key: `empty-${year}-${month}-${i}`,
      });
    }

    for (let day = 1; day <= count; day++) {
      const date = ethiopianToGregorian(year, month, day);
      if (!date) continue;

      cells.push({
        type: "day",
        key: ecKey(year, month, day),
        day,
        date,
      });
    }

    return cells;
  }, [year, month, disabled]);

  function moveMonth(direction: -1 | 1) {
    if (direction === 1) {
      if (month === 13) {
        setMonth(1);
        setYear((v) => v + 1);
      } else {
        setMonth((v) => v + 1);
      }
    } else {
      if (month === 1) {
        setMonth(13);
        setYear((v) => v - 1);
      } else {
        setMonth((v) => v - 1);
      }
    }
  }

  function isSelectable(date: Date) {
    if (disabled) return false;

    const key = dateKey(date);

    if (semesterStart) {
      const start = dateKey(new Date(semesterStart));
      if (key < start) return false;
    }

    if (semesterEnd) {
      const end = dateKey(new Date(semesterEnd));
      if (key > end) return false;
    }

    const closed = events.some(
      (event) =>
        event.isStudentClosed &&
        containsDate(event, date),
    );

    return !closed;
  }

  function selectDate(date: Date) {
    if (!isSelectable(date)) return;

    onChange(date.toISOString().slice(0, 10));
    setOpen(false);
  }

  const selectedEc = value
    ? gregorianToEthiopian(new Date(value))
    : null;

  const selectedText = selectedEc
    ? `${MONTHS[selectedEc.month - 1]} ${selectedEc.day}, ${selectedEc.year} E.C.`
    : "Select attendance date";

  const eventForDate = (date: Date) =>
    events.find((event) => containsDate(event, date));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-400"
      >
        <span className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-slate-500" />
          <span>
            <span className="block text-xs font-medium text-slate-500">
              Attendance Date
            </span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {selectedText}
            </span>
          </span>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              disabled={disabled}
              className="rounded-lg p-2 hover:bg-slate-100"
              aria-label="Previous Ethiopian month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-base font-bold text-slate-900">
                {MONTHS[month - 1]}
              </p>
              <p className="text-sm font-semibold text-slate-500">
                {year} E.C.
              </p>
            </div>

            <button
              type="button"
              onClick={() => moveMonth(1)}
              disabled={disabled}
              className="rounded-lg p-2 hover:bg-slate-100"
              aria-label="Next Ethiopian month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-bold text-slate-400"
              >
                {day}
              </div>
            ))}

            {days.map((cell) => {
              if (cell.type === "empty") {
                return (
                  <div
                    key={cell.key}
                    className="aspect-square"
                  />
                );
              }

              const event = eventForDate(cell.date);
              const closed = Boolean(
                event?.isStudentClosed,
              );
              const selectable = isSelectable(cell.date);

              const selected =
                selectedEc &&
                selectedEc.year === year &&
                selectedEc.month === month &&
                selectedEc.day === cell.day;

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!selectable}
                  onClick={() => selectDate(cell.date)}
                  title={
                    closed
                      ? event?.title ?? "School closed"
                      : undefined
                  }
                  className={[
                    "relative aspect-square rounded-lg text-sm font-semibold transition",
                    selected
                      ? "bg-brand-primary text-white"
                      : selectable
                        ? "text-slate-700 hover:bg-slate-100"
                        : "cursor-not-allowed bg-slate-100 text-slate-300",
                  ].join(" ")}
                >
                  {cell.day}

                  {event && (
                    <span
                      className={[
                        "absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                        closed
                          ? "bg-red-500"
                          : "bg-sky-500",
                      ].join(" ")}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                School closed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Calendar event
              </span>
            </div>

            <p className="mt-2">
              Closed school dates cannot be selected for attendance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}




