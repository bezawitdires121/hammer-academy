"use client";

import { useEffect, useMemo, useState } from "react";
import {
  generateShuffle,
  loadShufflePreview,
  finalizeShuffle,
} from "./actions";

type Option = {
  id: string;
  label?: string;
  level?: number;
};

type Props = {
  schoolYears: Option[];
  grades: Option[];
};

type SectionOption = {
  id: string;
  label: string;
  studentCount: number;
};

type Preview = {
  batch: {
    id: string;
    status: string;
    gradeLevel: number;
    schoolYearLabel: string;
    createdAt: Date;
  };

  previousYear: {
    id: string;
    label: string;
    sections: {
      sectionId: string;
      sectionLabel: string;
      studentCount: number;
      studentsWithResults: number;
      average: number | null;
    }[];
  } | null;

  proposals: {
    studentId: string;
    fullName: string;
    gender: "MALE" | "FEMALE" | null;
    currentSection: string;
    proposedSection: string;
    sameSection: boolean;
    previousSection: string | null;
    previousAverage: number | null;
    completedSemesters: number;
  }[];
};

export default function ShuffleManager({
  schoolYears,
  grades,
}: Props) {
  const [schoolYearId, setSchoolYearId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  const [balanceAcademic, setBalanceAcademic] = useState(true);
  const [balanceSize, setBalanceSize] = useState(true);
  const [balanceGender, setBalanceGender] = useState(true);
  const [minimizeStaying, setMinimizeStaying] = useState(false);

  useEffect(() => {
    if (!schoolYearId || !gradeId) {
      setSections([]);
      setSelectedSections([]);
      return;
    }

    let cancelled = false;

    async function loadSections() {
      setLoadingSections(true);
      setError("");
      setSuccess("");
      setPreview(null);
      setSelectedSections([]);

      try {
        const response = await fetch(
          `/api/admin/shuffle/sections?schoolYearId=${encodeURIComponent(
            schoolYearId
          )}&gradeId=${encodeURIComponent(gradeId)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Unable to load sections."
          );
        }

        if (!cancelled) {
          setSections(data.sections ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setSections([]);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sections."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSections(false);
        }
      }
    }

    loadSections();

    return () => {
      cancelled = true;
    };
  }, [schoolYearId, gradeId]);

  function resetMessages() {
    setError("");
    setSuccess("");
    setPreview(null);
  }

  function toggleSection(id: string) {
    resetMessages();

    setSelectedSections((current) =>
      current.includes(id)
        ? current.filter((sectionId) => sectionId !== id)
        : [...current, id]
    );
  }

  function selectAllSections() {
    resetMessages();
    setSelectedSections(sections.map((section) => section.id));
  }

  function clearSections() {
    resetMessages();
    setSelectedSections([]);
  }

  async function handleGenerate() {
    setError("");
    setSuccess("");
    setPreview(null);

    if (!schoolYearId || !gradeId) {
      setError("Select a school year and grade first.");
      return;
    }

    if (selectedSections.length < 2) {
      setError("Select at least two sections to shuffle.");
      return;
    }

    if (
      !balanceAcademic &&
      !balanceSize &&
      !balanceGender &&
      !minimizeStaying
    ) {
      setError("Select at least one balancing method.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("schoolYearId", schoolYearId);
      formData.set("gradeId", gradeId);

      selectedSections.forEach((id) =>
        formData.append("sectionIds", id)
      );

      formData.set("balanceAcademic", String(balanceAcademic));
      formData.set("balanceSize", String(balanceSize));
      formData.set("balanceGender", String(balanceGender));
      formData.set("minimizeStaying", String(minimizeStaying));

      const result = await generateShuffle(formData);

      if (!result.success || !result.batchId) {
        setError(
          result.error || "Unable to generate shuffle."
        );
        return;
      }

      const loaded = await loadShufflePreview(result.batchId);

      if ("error" in loaded) {
        setError(
          loaded.error || "Unable to load shuffle preview."
        );
        return;
      }

      setPreview(loaded as Preview);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the shuffle."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize() {
    if (!preview) return;

    const confirmed = window.confirm(
      "Finalize this promotion shuffle?\n\nThis will create or update the selected promoted students' enrollments in the new school year and assign their proposed sections.\n\nNew students are not affected.\n\nThis action cannot be automatically undone."
    );

    if (!confirmed) return;

    setFinalizing(true);
    setError("");
    setSuccess("");

    try {
      const result = await finalizeShuffle(preview.batch.id);

      if (!result.success) {
        setError(
          result.error || "Unable to finalize shuffle."
        );
        return;
      }

      setSuccess(
        "Promotion shuffle finalized successfully. Promoted students have been enrolled and assigned to their new sections."
      );

      const updated = await loadShufflePreview(
        preview.batch.id
      );

      if (!("error" in updated)) {
        setPreview(updated as Preview);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while finalizing the shuffle."
      );
    } finally {
      setFinalizing(false);
    }
  }

  const grouped = useMemo(() => {
    if (!preview) return {};

    return preview.proposals.reduce(
      (acc, student) => {
        if (!acc[student.proposedSection]) {
          acc[student.proposedSection] = [];
        }

        acc[student.proposedSection].push(student);

        return acc;
      },
      {} as Record<string, Preview["proposals"]>
    );
  }, [preview]);

  const movingCount =
    preview?.proposals.filter(
      (student) => !student.sameSection
    ).length ?? 0;

  const stayingCount =
    preview?.proposals.filter(
      (student) => student.sameSection
    ).length ?? 0;

  const resultCount =
    preview?.proposals.filter(
      (student) => student.previousAverage !== null
    ).length ?? 0;

  const noResultCount =
    preview?.proposals.filter(
      (student) => student.previousAverage === null
    ).length ?? 0;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold text-[#0f2a47]">
            Set Up Promotion Shuffle
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select the new school year, destination grade, and
            sections. The system uses eligible promoted students
            from the previous school year.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Destination School Year
              </span>

              <select
                value={schoolYearId}
                onChange={(e) => {
                  setSchoolYearId(e.target.value);
                  setGradeId("");
                  setSections([]);
                  setSelectedSections([]);
                  setPreview(null);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f2a47]"
              >
                <option value="">
                  Select school year
                </option>

                {schoolYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label} E.C.
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Destination Grade
              </span>

              <select
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setPreview(null);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f2a47]"
                disabled={!schoolYearId}
              >
                <option value="">
                  Select destination grade
                </option>

                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    Grade {grade.level}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Destination Sections
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  These are the new-year sections that promoted
                  students will be distributed into.
                </p>
              </div>

              {sections.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllSections}
                    className="font-medium text-[#0f2a47] hover:underline"
                  >
                    Select all
                  </button>

                  <span className="text-gray-300">|</span>

                  <button
                    type="button"
                    onClick={clearSections}
                    className="font-medium text-gray-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {!schoolYearId || !gradeId ? (
              <div className="mt-3 rounded-lg border border-dashed bg-gray-50 p-5 text-center text-sm text-gray-500">
                Select a school year and destination grade to
                see its sections.
              </div>
            ) : loadingSections ? (
              <div className="mt-3 rounded-lg border bg-gray-50 p-5 text-center text-sm text-gray-500">
                Loading sections...
              </div>
            ) : sections.length === 0 ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
                No sections exist for this grade in the selected
                school year.
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sections.map((section) => {
                  const selected =
                    selectedSections.includes(section.id);

                  return (
                    <button
                      type="button"
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={`rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-[#0f2a47] bg-blue-50 ring-1 ring-[#0f2a47]"
                          : "border-gray-200 bg-white hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-[#0f2a47]">
                          Section {section.label}
                        </span>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                            selected
                              ? "border-[#0f2a47] bg-[#0f2a47] text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        {section.studentCount} currently enrolled
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {sections.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {selectedSections.length} of {sections.length}{" "}
                destination sections selected
              </p>
            )}
          </div>

          <div className="border-t pt-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Balancing Methods
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                These rules are applied only to the eligible
                promoted students from the previous year.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={balanceAcademic}
                  onChange={(e) =>
                    setBalanceAcademic(e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-[#0f2a47]"
                />

                <div>
                  <div className="text-sm font-medium text-gray-800">
                    Previous-year academic performance
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500">
                    Balance using completed previous-year semester
                    averages. Incomplete results are ignored, not
                    treated as zero.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={balanceSize}
                  onChange={(e) =>
                    setBalanceSize(e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-[#0f2a47]"
                />

                <div>
                  <div className="text-sm font-medium text-gray-800">
                    Keep section sizes balanced
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500">
                    Keep the promoted students distributed as
                    evenly as possible.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={balanceGender}
                  onChange={(e) =>
                    setBalanceGender(e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-[#0f2a47]"
                />

                <div>
                  <div className="text-sm font-medium text-gray-800">
                    Balance male/female students
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500">
                    Spread recorded male and female students across
                    the selected destination sections.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={minimizeStaying}
                  onChange={(e) =>
                    setMinimizeStaying(e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-[#0f2a47]"
                />

                <div>
                  <div className="text-sm font-medium text-gray-800">
                    Minimize students staying in the same section
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500">
                    Prefer moving promoted students when the other
                    selected balancing rules are tied.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="flex justify-end border-t pt-5">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                loading ||
                loadingSections ||
                selectedSections.length < 2
              }
              className="rounded-lg bg-[#0f2a47] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Shuffle"}
            </button>
          </div>
        </div>
      </section>

      {preview && (
        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-[#0f2a47]">
                  Promotion Shuffle Results
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Previous-year students → Grade{" "}
                  {preview.batch.gradeLevel} ·{" "}
                  {preview.batch.schoolYearLabel} E.C.
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  preview.batch.status === "FINALIZED"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {preview.batch.status}
              </span>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  Promoted students
                </div>

                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {preview.proposals.length}
                </div>
              </div>

              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  Previous results
                </div>

                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {resultCount}
                </div>
              </div>

              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  Moving sections
                </div>

                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {movingCount}
                </div>
              </div>

              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  Staying
                </div>

                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {stayingCount}
                </div>
              </div>
            </div>

            {preview.previousYear && (
              <div className="rounded-lg border bg-gray-50 p-5">
                <h3 className="text-sm font-semibold text-gray-800">
                  Previous-Year Academic Basis
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Completed results from{" "}
                  <strong>
                    {preview.previousYear.label} E.C.
                  </strong>{" "}
                  were used when academic performance balancing
                  was selected.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {preview.previousYear.sections.map((section) => (
                    <div
                      key={section.sectionId}
                      className="rounded-lg border bg-white p-3"
                    >
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-[#0f2a47]">
                          {section.sectionLabel}
                        </span>

                        <span className="text-xs text-gray-500">
                          {section.studentCount} students
                        </span>
                      </div>

                      <div className="mt-2 text-lg font-bold">
                        {section.average !== null
                          ? `${section.average}%`
                          : "—"}
                      </div>

                      <div className="text-xs text-gray-500">
                        {section.studentsWithResults} with completed
                        results
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {Object.entries(grouped).map(
                ([section, students]) => (
                  <div
                    key={section}
                    className="overflow-hidden rounded-lg border"
                  >
                    <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                      <div>
                        <h3 className="font-semibold text-[#0f2a47]">
                          New Section {section}
                        </h3>

                        <p className="text-xs text-gray-500">
                          {students.length} promoted student
                          {students.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-white">
                          <tr className="text-left text-xs uppercase text-gray-500">
                            <th className="px-4 py-3">
                              Student
                            </th>

                            <th className="px-4 py-3">
                              Gender
                            </th>

                            <th className="px-4 py-3">
                              Previous Year Section
                            </th>

                            <th className="px-4 py-3">
                              Previous Average
                            </th>

                            <th className="px-4 py-3">
                              New Section
                            </th>

                            <th className="px-4 py-3">
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y">
                          {students.map((student) => (
                            <tr key={student.studentId}>
                              <td className="px-4 py-3 font-medium">
                                {student.fullName}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {student.gender ?? "Not recorded"}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {student.previousSection
                                  ? `Section ${student.previousSection}`
                                  : "—"}
                              </td>

                              <td className="px-4 py-3">
                                {student.previousAverage !== null ? (
                                  <span className="font-semibold text-[#0f2a47]">
                                    {student.previousAverage}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">
                                    No completed result
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <span className="font-semibold text-[#0f2a47]">
                                  Section {student.proposedSection}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                {student.sameSection ? (
                                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                    Staying
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                    Moving
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>

            {noResultCount > 0 && (
              <p className="text-xs text-gray-500">
                {noResultCount} student
                {noResultCount === 1 ? "" : "s"} had no completed
                previous-year result and were not treated as zero.
              </p>
            )}

            {preview.batch.status === "DRAFT" && (
              <div className="flex flex-col justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5 md:flex-row md:items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Review complete?
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Finalizing creates or updates the promoted
                    students&apos; enrollment in the destination
                    school year and assigns their new sections.
                    New students are not included.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {finalizing
                    ? "Finalizing..."
                    : "Finalize Promotion Shuffle"}
                </button>
              </div>
            )}

            {preview.batch.status === "FINALIZED" && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                This promotion shuffle has been finalized.
                Promoted students have been enrolled in the
                destination school year and assigned to their
                proposed sections.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
