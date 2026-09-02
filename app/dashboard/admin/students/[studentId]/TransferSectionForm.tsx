"use client";

import { useState, useTransition } from "react";
import Toast from "@/components/Toast";
import { transferSection } from "./actions";

type Section = {
  id: string;
  label: string;
  grade: {
    level: number;
  };
  schoolYear: {
    label: string;
  };
};

type SchoolYear = {
  id: string;
  label: string;
  isCurrent: boolean;
};

export default function TransferSectionForm({
  studentId,
  sections,
  schoolYears,
}: {
  studentId: string;
  sections: Section[];
  schoolYears: SchoolYear[];
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setToast(null);
    setError(null);

    startTransition(async () => {
      const result = await transferSection(studentId, formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setToast("Student transfer saved successfully.");
    });
  }

  return (
    <>
      <form action={submit} className="space-y-3 p-6">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            School Year
          </label>

          <select
            name="schoolYearId"
            required
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f2a47] disabled:opacity-50"
          >
            <option value="">Select school year...</option>

            {schoolYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.label}
                {year.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Section
          </label>

          <select
            name="sectionId"
            required
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f2a47] disabled:opacity-50"
          >
            <option value="">Select section...</option>

            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Grade {section.grade.level} — {section.label} (
                {section.schoolYear.label})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0f2a47] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save transfer"}
        </button>
      </form>

      <Toast
        message={toast}
        type="success"
        onClose={() => setToast(null)}
      />
    </>
  );
}
