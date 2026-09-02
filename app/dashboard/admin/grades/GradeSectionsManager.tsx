"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createGrade,
  deleteGrade,
} from "./actions";
import {
  editSection,
  deleteSection,
} from "../sections/actions";

type SchoolYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

type Section = {
  id: string;
  label: string;
  schoolYearId: string;
  schoolYearLabel: string;
  studentCount: number;
  homeroomTeacher: {
    id: string;
    fullName: string;
    photoUrl: string | null;
  } | null;
};

type Grade = {
  id: string;
  level: number;
  sections: Section[];
};

export default function GradeSectionsManager({
  grades,
  schoolYears,
}: {
  grades: Grade[];
  schoolYears: SchoolYear[];
}) {
  const currentSchoolYear =
    schoolYears.find((year) => year.isCurrent) ?? schoolYears[0] ?? null;

  const [selectedYear, setSelectedYear] = useState(
    currentSchoolYear?.id ?? ""
  );

  const [selectedGrade, setSelectedGrade] = useState("all");
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredGrades = useMemo(() => {
    const search = query.trim().toLowerCase();

    return grades
      .map((grade) => {
        const sections = grade.sections.filter((section) => {
          const matchesYear =
            !selectedYear || section.schoolYearId === selectedYear;

          const matchesSearch =
            !search ||
            `${grade.level}${section.label}`.toLowerCase().includes(search) ||
            section.label.toLowerCase().includes(search) ||
            section.homeroomTeacher?.fullName
              ?.toLowerCase()
              .includes(search);

          return matchesYear && matchesSearch;
        });

        const matchesGrade =
          selectedGrade === "all" ||
          String(grade.level) === selectedGrade;

        if (!matchesGrade || sections.length === 0) {
          return null;
        }

        return {
          ...grade,
          sections,
        };
      })
      .filter(Boolean) as Grade[];
  }, [grades, selectedYear, selectedGrade, query]);

  function clearMessages() {
    setMessage(null);
    setError(null);
  }

  function submitCreate(formData: FormData) {
    clearMessages();

    startTransition(async () => {
      const result = await createGrade(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage(
        result?.created?.length
          ? `Grade created with sections: ${result.created.join(", ")}.`
          : "Grade already exists with those sections."
      );

      setShowCreate(false);
    });
  }

  function handleDeleteGrade(gradeId: string, level: number) {
    if (
      !window.confirm(
        `Delete Grade ${level}? This will only be allowed if it has no students, teacher assignments, or other protected records.`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("gradeId", gradeId);

    clearMessages();

    startTransition(async () => {
      const result = await deleteGrade(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage(`Grade ${level} deleted.`);
    });
  }

  function handleDeleteSection(section: Section, gradeLevel: number) {
    if (
      !window.confirm(
        `Delete section ${gradeLevel}${section.label}? This is only allowed when the section has no students or protected records.`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("sectionId", section.id);

    clearMessages();

    startTransition(async () => {
      const result = await deleteSection(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage(`Section ${gradeLevel}${section.label} deleted.`);
    });
  }

  function handleSaveSection(formData: FormData) {
    clearMessages();

    startTransition(async () => {
      const result = await editSection(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage("Section updated.");
      setEditingSection(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Grades & Sections
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage grades and their sections for each Ethiopian school year.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            clearMessages();
            setShowCreate(true);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Create Grade
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search grades, sections, or teachers..."
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none"
          >
            <option value="">All school years</option>

            {schoolYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.label} E.C.
                {year.isCurrent ? " — Current" : ""}
              </option>
            ))}
          </select>

          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none"
          >
            <option value="all">All grades</option>

            {grades.map((grade) => (
              <option key={grade.id} value={grade.level}>
                Grade {grade.level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
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

      {/* Grades */}
      <div className="space-y-5">
        {filteredGrades.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <p className="font-medium text-slate-700">
              No grades or sections found.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing the school year, grade, or search filters.
            </p>
          </div>
        ) : (
          filteredGrades.map((grade) => (
            <section
              key={grade.id}
              className="overflow-hidden rounded-xl border bg-white"
            >
              {/* Grade header */}
              <div className="flex flex-col gap-3 border-b bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Grade {grade.level}
                    </h2>

                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {grade.sections.length}{" "}
                      {grade.sections.length === 1
                        ? "section"
                        : "sections"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleDeleteGrade(grade.id, grade.level)
                  }
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Delete Grade
                </button>
              </div>

              {/* Sections */}
              <div className="divide-y">
                {grade.sections.map((section) => (
                  <div
                    key={section.id}
                    className="px-5 py-4"
                  >
                    {editingSection?.id === section.id ? (
                      <form
                        action={handleSaveSection}
                        className="flex flex-col gap-3 sm:flex-row sm:items-end"
                      >
                        <input
                          type="hidden"
                          name="sectionId"
                          value={section.id}
                        />

                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Section label
                          </label>

                          <input
                            name="label"
                            defaultValue={section.label}
                            maxLength={1}
                            required
                            autoFocus
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none focus:border-slate-400"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {isPending ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingSection(null)}
                          className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-800">
                            {grade.level}
                            {section.label}
                          </div>

                          <div>
                            <div className="font-medium text-slate-900">
                              Section {grade.level}
                              {section.label}
                            </div>

                            <div className="mt-0.5 text-sm text-slate-500">
                              {section.schoolYearLabel} E.C.
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-5 text-sm">
                          <div>
                            <span className="font-semibold text-slate-900">
                              {section.studentCount}
                            </span>{" "}
                            <span className="text-slate-500">
                              {section.studentCount === 1
                                ? "student"
                                : "students"}
                            </span>
                          </div>

                          <div className="min-w-[150px]">
                            <span className="text-slate-400">
                              Homeroom:
                            </span>{" "}
                            <span className="text-slate-700">
                              {section.homeroomTeacher?.fullName ?? "Not assigned"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingSection(section)}
                            className="font-medium text-slate-700 hover:text-slate-900"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleDeleteSection(section, grade.level)
                            }
                            className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Create Grade Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Create Grade
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose a school year and the number of sections to create.
              </p>
            </div>

            <form
              action={submitCreate}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  School Year
                </label>

                <select
                  name="schoolYearId"
                  defaultValue={selectedYear}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Select school year
                  </option>

                  {schoolYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.label} E.C.
                      {year.isCurrent ? " — Current" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Grade
                </label>

                <input
                  name="level"
                  type="number"
                  min={1}
                  max={12}
                  required
                  placeholder="Example: 8"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Number of Sections
                </label>

                <input
                  name="sectionsCount"
                  type="number"
                  min={1}
                  max={26}
                  defaultValue={1}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />

                <p className="mt-1 text-xs text-slate-500">
                  For example, 4 creates A, B, C and D.
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <strong>Example:</strong> Grade 8 + 4 sections → 8A, 8B,
                8C, 8D
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Create Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}