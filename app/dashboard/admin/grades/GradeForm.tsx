"use client";

import { useState, useTransition } from "react";
import { createGrade } from "./actions";

type SchoolYear = {
  id: string;
  label: string;
  isCurrent: boolean;
};

export default function GradeForm({
  schoolYears,
}: {
  schoolYears: SchoolYear[];
}) {
  const currentYear = schoolYears.find((year) => year.isCurrent);

  const [level, setLevel] = useState(1);
  const [sectionsCount, setSectionsCount] = useState(1);
  const [schoolYearId, setSchoolYearId] = useState(currentYear?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage(null);
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createGrade(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setMessage(
        result?.created?.length
          ? `Grade ${level} created with ${result.created.length} section${
              result.created.length === 1 ? "" : "s"
            }: ${result.created.join(", ")}`
          : `Grade ${level} already exists for this school year.`
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            School Year
          </label>

          <select
            name="schoolYearId"
            value={schoolYearId}
            onChange={(e) => setSchoolYearId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5"
          >
            <option value="">Select school year</option>

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
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Number of Sections
          </label>

          <input
            name="sectionsCount"
            type="number"
            min={0}
            max={26}
            value={sectionsCount}
            onChange={(e) => setSectionsCount(Number(e.target.value))}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5"
          />
        </div>
      </div>

      {sectionsCount > 0 && (
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Sections that will be created
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from({ length: sectionsCount }, (_, index) => (
              <span
                key={index}
                className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {level}
                {String.fromCharCode(65 + index)}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !schoolYearId}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Grade & Sections"}
      </button>
    </form>
  );
}