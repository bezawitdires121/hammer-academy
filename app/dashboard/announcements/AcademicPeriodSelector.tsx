"use client";

type Semester = {
  id: string;
  name: string;
  number: number;
};

type SchoolYear = {
  id: string;
  label: string;
  isCurrent: boolean;
  semesters: Semester[];
};

type Props = {
  schoolYears: SchoolYear[];
  selectedSchoolYearId: string;
  selectedSemesterId: string;
};

export default function AcademicPeriodSelector({
  schoolYears,
  selectedSchoolYearId,
  selectedSemesterId,
}: Props) {
  const selectedSchoolYear =
    schoolYears.find((year) => year.id === selectedSchoolYearId) ??
    schoolYears[0];

  const semesters = selectedSchoolYear?.semesters ?? [];

  function changePeriod(
    schoolYearId: string,
    semesterId: string
  ) {
    const params = new URLSearchParams();

    params.set("schoolYearId", schoolYearId);
    params.set("semesterId", semesterId);

    window.location.href =
      `/dashboard/announcements?${params.toString()}`;
  }

  function handleSchoolYearChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const schoolYearId = event.target.value;

    const year = schoolYears.find(
      (item) => item.id === schoolYearId
    );

    const firstSemester = year?.semesters[0];

    if (!firstSemester) {
      return;
    }

    changePeriod(schoolYearId, firstSemester.id);
  }

  function handleSemesterChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    changePeriod(
      selectedSchoolYearId,
      event.target.value
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label
          htmlFor="schoolYearId"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          School Year
        </label>

        <select
          id="schoolYearId"
          value={selectedSchoolYearId}
          onChange={handleSchoolYearChange}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {schoolYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
              {year.isCurrent ? " — Current" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="semesterId"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Semester
        </label>

        <select
          id="semesterId"
          value={selectedSemesterId}
          onChange={handleSemesterChange}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
