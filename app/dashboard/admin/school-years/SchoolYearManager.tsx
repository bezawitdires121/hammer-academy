"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  createSchoolYear,
  setCurrentSchoolYear,
  updateSchoolYear,
  toggleSemesterLock,
} from "./actions";
import {
  formatEthiopianDisplay,
  gregorianToEthiopian,
  ethiopianToGregorian,
} from "@/lib/ethiopian-calendar";

type Semester = {
  id?: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  isLocked?: boolean;
};

type SchoolYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  semesters: Semester[];
};

const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazya",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

function toEth(date: string) {
  if (!date) return { year: "", month: "", day: "" };

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return { year: "", month: "", day: "" };
  }

  const eth = gregorianToEthiopian(d);

  return {
    year: String(eth.year),
    month: String(eth.month),
    day: String(eth.day),
  };
}

function ethToIso(year: string, month: string, day: string) {
  if (!year || !month || !day) return "";

  const date = ethiopianToGregorian(
    Number(year),
    Number(month),
    Number(day)
  );

  return date ? date.toISOString().slice(0, 10) : "";
}

function EthiopianDateFields({
  namePrefix,
  label,
  initialDate,
}: {
  namePrefix: string;
  label: string;
  initialDate?: string;
}) {
  const initial = toEth(initialDate ?? "");

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  const iso = ethToIso(year, month, day);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
        <input
          name={`${namePrefix}Year`}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          type="number"
          min="1900"
          max="2500"
          placeholder="2019"
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400"
        />

        <select
          name={`${namePrefix}Month`}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400"
        >
          <option value="">Month</option>

          {ETHIOPIAN_MONTHS.map((monthName, index) => (
            <option key={index + 1} value={index + 1}>
              {monthName}
            </option>
          ))}
        </select>

        <input
          name={`${namePrefix}Day`}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          type="number"
          min="1"
          max={month === "13" ? "6" : "30"}
          placeholder="1"
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400"
        />
      </div>

      <input
        type="hidden"
        name={`${namePrefix}Date`}
        value={iso}
      />
    </div>
  );
}

function emptySemester(number: number): Semester {
  return {
    name: `Semester ${number}`,
    number,
    startDate: "",
    endDate: "",
    isCurrent: false,
  };
}

export default function SchoolYearManager({
  schoolYears,
}: {
  schoolYears: SchoolYear[];
}) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SchoolYear | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [semesters, setSemesters] = useState<Semester[]>([
    emptySemester(1),
    emptySemester(2),
  ]);

  const filteredYears = useMemo(() => {
    const search = query.toLowerCase().trim();

    if (!search) return schoolYears;

    return schoolYears.filter((year) =>
      year.label.toLowerCase().includes(search)
    );
  }, [query, schoolYears]);

  function openCreate() {
    setShowCreate(true);
    setEditing(null);
    setError(null);
    setMessage(null);
    setSemesters([emptySemester(1), emptySemester(2)]);
  }

  function openEdit(year: SchoolYear) {
    setEditing(year);
    setShowCreate(false);
    setError(null);
    setMessage(null);

    setSemesters(
      year.semesters.length > 0
        ? year.semesters.map((semester, index) => ({
            ...semester,
            number: index + 1,
          }))
        : [emptySemester(1), emptySemester(2)]
    );
  }

  function closeModal() {
    setShowCreate(false);
    setEditing(null);
    setError(null);
  }

  function addSemester() {
    setSemesters((current) => [
      ...current,
      emptySemester(current.length + 1),
    ]);
  }

  function removeSemester(index: number) {
    setSemesters((current) => {
      if (current.length <= 1) return current;

      return current
        .filter((_, semesterIndex) => semesterIndex !== index)
        .map((semester, semesterIndex) => ({
          ...semester,
          number: semesterIndex + 1,
          name:
            semester.name.trim() === `Semester ${semesterIndex + 2}`
              ? `Semester ${semesterIndex + 1}`
              : semester.name,
        }));
    });
  }

  function updateSemester(
    index: number,
    field: "name" | "startDate" | "endDate",
    value: string
  ) {
    setSemesters((current) =>
      current.map((semester, semesterIndex) =>
        semesterIndex === index
          ? {
              ...semester,
              [field]: value,
            }
          : semester
      )
    );
  }

  function submitCreate(formData: FormData) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await createSchoolYear(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage("School year created successfully.");
      setShowCreate(false);
    });
  }

  function submitEdit(formData: FormData) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updateSchoolYear(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage("School year updated successfully.");
      setEditing(null);
    });
  }

  function toggleLock(semesterId: string) {
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("semesterId", semesterId);

    startTransition(async () => {
      const result = await toggleSemesterLock(formData);

      if ("error" in result) {
        setError(result.error ?? "Operation failed.");
        return;
      }

      setMessage(
        result.isLocked
          ? "Semester locked successfully."
          : "Semester unlocked successfully."
      );
    });
  }
  function makeCurrent(id: string) {
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("id", id);

    startTransition(async () => {
      const result = await setCurrentSchoolYear(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage("Current school year updated.");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            School Years
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage Ethiopian school years and their academic semesters.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Create School Year
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search school years..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredYears.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <p className="font-medium text-slate-700">
              No school years found.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create a school year to get started.
            </p>
          </div>
        ) : (
          filteredYears.map((year) => (
            <div
              key={year.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {year.label} E.C.
                    </h2>

                    {year.isCurrent && (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        CURRENT
                      </span>
                    )}
                  </div>

                  {year.semesters?.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {year.semesters.map((semester) => (
                        <div
                          key={semester.id ?? semester.number}
                          className={`rounded-lg border p-3 ${
                            semester.isLocked
                              ? "border-red-200 bg-red-50/40"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />

                            <span className="text-sm font-medium text-slate-800">
                              {semester.name}
                            </span>

                            {semester.isCurrent && (
                              <span className="ml-auto text-[10px] font-semibold text-green-700">
                                CURRENT
                              </span>
                            )}

                            {semester.isLocked && (
                              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                LOCKED
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {formatEthiopianDisplay(semester.startDate)} –{" "}
                            {formatEthiopianDisplay(semester.endDate)}
                          </p>

                          <button
                            type="button"
                            disabled={isPending || !semester.id}
                            onClick={() => {
                              if (semester.id) {
                                toggleLock(semester.id);
                              }
                            }}
                            className={`mt-3 w-full rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                              semester.isLocked
                                ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {semester.isLocked
                              ? "Unlock Semester"
                              : "Lock Semester"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No semesters configured.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:pt-1">
                  <Link
                    href={`/dashboard/admin/calendar?schoolYearId=${year.id}`}
                    className="rounded-lg bg-[#0f2a47] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0b2037]"
                  >
                    Calendar
                  </Link>

                  <button
                    type="button"
                    onClick={() => openEdit(year)}
                    className="rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>

                  {!year.isCurrent && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => makeCurrent(year.id)}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Set Current
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {(showCreate || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? "Edit School Year" : "Create School Year"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure the school year and its semesters using the
                Ethiopian calendar.
              </p>
            </div>

            <form
              action={editing ? submitEdit : submitCreate}
              className="space-y-5"
            >
              {editing && (
                <input type="hidden" name="id" value={editing.id} />
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ethiopian School Year
                </label>

                <input
                  name="label"
                  type="text"
                  required
                  defaultValue={editing?.label ?? ""}
                  placeholder="2019"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Semesters
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Add as many semesters as this school year requires.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addSemester}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    + Add Semester
                  </button>
                </div>

                {semesters.map((semester, index) => (
                  <div
                    key={`${semester.id ?? "new"}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Semester {index + 1}
                      </div>

                      {semesters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSemester(index)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Semester name
                        </label>

                        <input
                          name={`semester${index + 1}Name`}
                          value={semester.name}
                          onChange={(e) =>
                            updateSemester(index, "name", e.target.value)
                          }
                          required
                          placeholder={`Semester ${index + 1}`}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400"
                        />
                      </div>

                      <EthiopianDateFields
                        namePrefix={`semester${index + 1}Start`}
                        label="Start date"
                        initialDate={semester.startDate}
                      />

                      <EthiopianDateFields
                        namePrefix={`semester${index + 1}End`}
                        label="End date"
                        initialDate={semester.endDate}
                      />

                      <input
                        type="hidden"
                        name={`semester${index + 1}Number`}
                        value={index + 1}
                      />

                      {semester.id && (
                        <input
                          type="hidden"
                          name={`semester${index + 1}Id`}
                          value={semester.id}
                        />
                      )}
                    </div>
                  </div>
                ))}

                <input
                  type="hidden"
                  name="semesterCount"
                  value={semesters.length}
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <strong>How this works:</strong> the school year gets its
                overall period automatically from the first semester's start
                date and the last semester's end date.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Create School Year"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}





