"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  daysInEthiopianMonth,
  ethiopianToGregorian,
  formatEthiopianDate,
  formatEthiopianDisplay,
  gregorianToEthiopian,
  parseEthiopianDate,
} from "@/lib/ethiopian-calendar";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  semesterStart: string;
  semesterEnd: string;
  minDate?: string;
  required?: boolean;
  optional?: boolean;
};

function isoDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function gregorianIsoToEthiopian(iso: string) {
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) return null;

  return gregorianToEthiopian(parsed);
}

function sameOrAfter(value: string, minimum?: string) {
  if (!minimum) return true;
  return value >= minimum;
}

function sameOrBefore(value: string, maximum?: string) {
  if (!maximum) return true;
  return value <= maximum;
}

export default function EthiopianHomeworkDatePicker({
  label,
  value,
  onChange,
  semesterStart,
  semesterEnd,
  minDate,
  required = false,
  optional = false,
}: Props) {
  const semesterStartIso = useMemo(() => {
    if (!semesterStart) return "";
    return isoDate(new Date(semesterStart));
  }, [semesterStart]);

  const semesterEndIso = useMemo(() => {
    if (!semesterEnd) return "";
    return isoDate(new Date(semesterEnd));
  }, [semesterEnd]);

  const effectiveMin = useMemo(() => {
    if (!semesterStartIso) return "";

    if (!minDate) return semesterStartIso;

    return minDate > semesterStartIso
      ? minDate
      : semesterStartIso;
  }, [minDate, semesterStartIso]);

  const effectiveMax = semesterEndIso;

  const initialEthiopian = useMemo(() => {
    if (!semesterStartIso || !semesterEndIso) return null;

    const parsedValue = value
      ? parseEthiopianDate(value)
      : null;

    if (parsedValue) {
      const key = isoDate(parsedValue);

      if (
        sameOrAfter(key, effectiveMin) &&
        sameOrBefore(key, effectiveMax)
      ) {
        return gregorianToEthiopian(parsedValue);
      }
    }

    return gregorianIsoToEthiopian(effectiveMin);
  }, [value, effectiveMin, effectiveMax, semesterStartIso, semesterEndIso]);

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(
    initialEthiopian?.year ?? 2018
  );
  const [month, setMonth] = useState(
    initialEthiopian?.month ?? 1
  );

  useEffect(() => {
    const next = initialEthiopian;

    if (!next) return;

    setYear(next.year);
    setMonth(next.month);
  }, [initialEthiopian?.year, initialEthiopian?.month]);

  const monthName = [
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
    "Pagume",
  ][month - 1];

  const firstGregorian = ethiopianToGregorian(
    year,
    month,
    1
  );

  const days = daysInEthiopianMonth(year, month);

  const firstWeekday = firstGregorian
    ? (firstGregorian.getUTCDay() + 6) % 7
    : 0;

  const cells: Array<number | null> = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= days; day++) {
    cells.push(day);
  }

  function previousMonth() {
    if (month === 1) {
      setYear((current) => current - 1);
      setMonth(13);
    } else {
      setMonth((current) => current - 1);
    }
  }

  function nextMonth() {
    if (month === 13) {
      setYear((current) => current + 1);
      setMonth(1);
    } else {
      setMonth((current) => current + 1);
    }
  }

  function selectDay(day: number) {
    const date = ethiopianToGregorian(
      year,
      month,
      day
    );

    if (!date) return;

    const key = isoDate(date);

    if (
      !sameOrAfter(key, effectiveMin) ||
      !sameOrBefore(key, effectiveMax)
    ) {
      return;
    }

    // IMPORTANT:
    // Keep the form value in canonical Ethiopian YYYY-MM-DD format.
    // Human-readable Ethiopian text is only for display.
    onChange(formatEthiopianDate(date));

    setOpen(false);
  }

  const selectedGregorian = value
    ? parseEthiopianDate(value)
    : null;

  const selectedKey = selectedGregorian
    ? isoDate(selectedGregorian)
    : "";

  const displayValue = selectedGregorian
    ? formatEthiopianDisplay(selectedGregorian)
    : "";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[46px] w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 text-left transition hover:border-brand-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
      >
        <CalendarDays
          size={18}
          className="shrink-0 text-gray-500"
        />

        <span
          className={
            value
              ? "flex-1 text-sm text-gray-900"
              : "flex-1 text-sm text-gray-400"
          }
        >
          {displayValue ||
            (optional
              ? "Select date (optional)"
              : "Select Ethiopian date")}
        </span>

        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                event.stopPropagation();
                onChange("");
              }
            }}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label={`Clear ${label}`}
          >
            <X size={15} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[320px] max-w-[380px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={previousMonth}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Previous Ethiopian month"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">
                {monthName}
              </p>
              <p className="text-xs text-gray-500">
                {year} E.C.
              </p>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Next Ethiopian month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-gray-500">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-9"
                  />
                );
              }

              const date = ethiopianToGregorian(
                year,
                month,
                day
              );

              if (!date) {
                return (
                  <div
                    key={`${year}-${month}-${day}`}
                    className="h-9"
                  />
                );
              }

              const key = isoDate(date);

              const selectable =
                sameOrAfter(key, effectiveMin) &&
                sameOrBefore(key, effectiveMax);

              const selected = key === selectedKey;

              return (
                <button
                  key={`${year}-${month}-${day}`}
                  type="button"
                  disabled={!selectable}
                  onClick={() => selectDay(day)}
                  className={[
                    "h-9 rounded-lg text-sm font-medium transition",
                    selectable
                      ? "text-gray-800 hover:bg-gray-100"
                      : "cursor-not-allowed text-gray-300",
                    selected
                      ? "bg-brand-primary text-white hover:bg-brand-primary"
                      : "",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-[11px] leading-4 text-gray-500">
              Only dates inside the selected semester can
              be selected.
            </p>

            <p className="mt-1 text-[11px] font-medium text-gray-600">
              {semesterStartIso && semesterEndIso ? (
                <>
                  {formatEthiopianDisplay(
                    new Date(
                      `${semesterStartIso}T00:00:00.000Z`
                    )
                  )}
                  {" – "}
                  {formatEthiopianDisplay(
                    new Date(
                      `${semesterEndIso}T00:00:00.000Z`
                    )
                  )}
                </>
              ) : (
                "Select a semester first"
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
