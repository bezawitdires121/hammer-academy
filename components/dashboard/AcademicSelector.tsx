
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";

type SemesterOption = {
  id: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
};

type SchoolYearOption = {
  id: string;
  label: string;
  isCurrent: boolean;
  semesters: SemesterOption[];
};

export default function AcademicSelector({
  schoolYears,
}: {
  schoolYears: SchoolYearOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedYearId =
    searchParams.get("schoolYearId") ?? "";

  const selectedSemesterId =
    searchParams.get("semesterId") ?? "";

  const selectedYear = useMemo(() => {
    return (
      schoolYears.find(
        (year) => year.id === selectedYearId
      ) ??
      schoolYears.find((year) => year.isCurrent) ??
      schoolYears[0] ??
      null
    );
  }, [schoolYears, selectedYearId]);

  const selectedSemester = useMemo(() => {
    if (!selectedYear) return null;

    return (
      selectedYear.semesters.find(
        (semester) => semester.id === selectedSemesterId
      ) ??
      selectedYear.semesters.find(
        (semester) => semester.number === 1
      ) ??
      selectedYear.semesters[0] ??
      null
    );
  }, [selectedYear, selectedSemesterId]);

  function updateContext(
    yearId: string,
    semesterId: string
  ) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set("schoolYearId", yearId);
    params.set("semesterId", semesterId);

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleYearChange(yearId: string) {
    const year = schoolYears.find(
      (item) => item.id === yearId
    );

    if (!year) return;

    const semester =
      year.semesters.find(
        (item) => item.number === 1
      ) ??
      year.semesters[0];

    if (!semester) {
      const params = new URLSearchParams(
        searchParams.toString()
      );

      params.set("schoolYearId", year.id);
      params.delete("semesterId");

      router.push(
        `${pathname}?${params.toString()}`
      );

      return;
    }

    updateContext(year.id, semester.id);
  }

  function handleSemesterChange(
    semesterId: string
  ) {
    if (!selectedYear) return;

    updateContext(
      selectedYear.id,
      semesterId
    );
  }

  if (schoolYears.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-semibold text-slate-500">
          No school year available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <label
          htmlFor="academic-school-year"
          className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          School Year
        </label>

        <select
          id="academic-school-year"
          value={selectedYear?.id ?? ""}
          onChange={(event) =>
            handleYearChange(event.target.value)
          }
          className="w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400"
        >
          {schoolYears.map((year) => (
            <option
              key={year.id}
              value={year.id}
            >
              {year.label} E.C.
              {year.isCurrent ? " Current" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="academic-semester"
          className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          Semester
        </label>

        <select
          id="academic-semester"
          value={selectedSemester?.id ?? ""}
          onChange={(event) =>
            handleSemesterChange(
              event.target.value
            )
          }
          disabled={
            !selectedYear ||
            selectedYear.semesters.length === 0
          }
          className="w-full min-w-[170px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {selectedYear?.semesters.map(
            (semester) => (
              <option
                key={semester.id}
                value={semester.id}
              >
                {semester.name}
              </option>
            )
          )}
        </select>
      </div>

      {selectedSemester && (
        <div className="hidden xl:block">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-transparent">
            Dates
          </p>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-medium text-slate-600">
              {formatEthiopianDisplay(
                selectedSemester.startDate
              )}
              {" - "}
              {formatEthiopianDisplay(
                selectedSemester.endDate
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
