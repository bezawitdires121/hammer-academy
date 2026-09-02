"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ethiopianToGregorian,
  gregorianToEthiopian,
  formatEthiopianDisplay,
  daysInEthiopianMonth,
} from "@/lib/ethiopian-calendar";

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

function todayEthiopian() {
  return gregorianToEthiopian(new Date());
}

function findDateInput(): HTMLInputElement | null {
  return (
    document.querySelector<HTMLInputElement>(
      'input[type="date"][name="date"]',
    ) ??
    document.querySelector<HTMLInputElement>(
      'input[type="date"]#date',
    ) ??
    document.querySelector<HTMLInputElement>(
      'input[type="date"]',
    )
  );
}

function parseGregorianValue(value: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return null;

  return gregorianToEthiopian(date);
}

function gregorianInputValue(
  year: number,
  month: number,
  day: number,
) {
  const date = ethiopianToGregorian(year, month, day);

  if (!date) return "";

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export default function EthiopianDatePicker() {
  const initial = todayEthiopian();

  const [selected, setSelected] = useState({
    year: initial.year,
    month: initial.month,
    day: initial.day,
  });

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const input = findDateInput();

    if (!input) return;

    const existing = parseGregorianValue(input.value);

    if (existing) {
      setSelected(existing);
      setViewYear(existing.year);
      setViewMonth(existing.month);
    }
  }, []);

  useEffect(() => {
    const input = findDateInput();

    if (!input) return;

    input.style.display = "none";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
  });

  const days = useMemo(() => {
    const count = daysInEthiopianMonth(
      viewYear,
      viewMonth,
    );

    const firstGregorian = ethiopianToGregorian(
      viewYear,
      viewMonth,
      1,
    );

    if (!firstGregorian) return [];

    /*
     * Ethiopian weekday grid is displayed Monday -> Sunday.
     * JS UTC weekday:
     * 0 Sunday
     * 1 Monday
     * ...
     * 6 Saturday
     */
    const jsDay = firstGregorian.getUTCDay();

    const mondayOffset =
      jsDay === 0 ? 6 : jsDay - 1;

    return [
      ...Array(mondayOffset).fill(null),
      ...Array.from(
        { length: count },
        (_, index) => index + 1,
      ),
    ];
  }, [viewYear, viewMonth]);

  function syncInput(
    year: number,
    month: number,
    day: number,
  ) {
    const input = findDateInput();

    if (!input) return;

    const value = gregorianInputValue(
      year,
      month,
      day,
    );

    if (!value) return;

    const nativeSetter =
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;

    if (nativeSetter) {
      nativeSetter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );

    input.dispatchEvent(
      new Event("change", {
        bubbles: true,
      }),
    );
  }

  function selectDay(day: number) {
    const next = {
      year: viewYear,
      month: viewMonth,
      day,
    };

    setSelected(next);
    syncInput(
      next.year,
      next.month,
      next.day,
    );
    setOpen(false);
  }

  function previousMonth() {
    if (viewMonth === 1) {
      setViewMonth(13);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 13) {
      setViewMonth(1);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  }

  const selectedLabel =
    formatEthiopianDisplay(
      ethiopianToGregorian(
        selected.year,
        selected.month,
        selected.day,
      ) ?? new Date(),
    );

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>

        <span className="text-slate-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-2 w-full min-w-[320px] max-w-[390px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
          role="dialog"
          aria-label="Ethiopian calendar"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={previousMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50"
              aria-label="Previous Ethiopian month"
            >
              ‹
            </button>

            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">
                {MONTHS[viewMonth - 1]}
              </p>

              <p className="text-xs font-semibold text-slate-500">
                {viewYear} E.C.
              </p>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50"
              aria-label="Next Ethiopian month"
            >
              ›
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="py-1 text-center text-[11px] font-bold text-slate-400"
              >
                {weekday}
              </div>
            ))}

            {days.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-10"
                  />
                );
              }

              const isSelected =
                selected.year === viewYear &&
                selected.month === viewMonth &&
                selected.day === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={
                    isSelected
                      ? "h-10 rounded-lg bg-brand-primary text-sm font-bold text-white"
                      : "h-10 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3 text-center">
            <p className="text-[11px] text-slate-400">
              Ethiopian calendar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
