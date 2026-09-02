"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Section = {
  id: string;
  label: string;
  grade: { level: number };
  schoolYear: { label: string };
};

type Props = {
  sections: Section[];
};

export default function BulkActions({ sections }: Props) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      const boxes = Array.from(
        document.querySelectorAll<HTMLInputElement>(".student-checkbox")
      );

      const checked = boxes.filter((box) => box.checked);
      const ids = checked.map((box) => box.value);

      setSelectedIds(ids);
      setSelectAll(boxes.length > 0 && checked.length === boxes.length);
    };

    const boxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(".student-checkbox")
    );

    boxes.forEach((box) => {
      box.addEventListener("change", handleChange);
    });

    handleChange();

    return () => {
      boxes.forEach((box) => {
        box.removeEventListener("change", handleChange);
      });
    };
  }, []);

  function toggleSelectAll() {
    const boxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(".student-checkbox")
    );

    const next = !selectAll;

    boxes.forEach((box) => {
      box.checked = next;
    });

    setSelectAll(next);
    setSelectedIds(next ? boxes.map((box) => box.value) : []);
  }

  function clearSelection() {
    const boxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(".student-checkbox")
    );

    boxes.forEach((box) => {
      box.checked = false;
    });

    setSelectAll(false);
    setSelectedIds([]);
  }

  async function handleDelete() {
    if (selectedIds.length === 0 || deleting) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${selectedIds.length} selected student${selectedIds.length === 1 ? "" : "s"}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch("/api/admin/students/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          studentIds: selectedIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete students.");
      }

      clearSelection();
      router.refresh();

      window.alert(data?.message || "Students deleted successfully.");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to delete students."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">

        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>{selectAll ? "Unselect All" : "Select All"}</span>
        </label>

        <span className="text-sm text-gray-500">
          {selectedIds.length} selected
        </span>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            disabled={deleting}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Selection
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">

          <select
            id="bulk-section"
            defaultValue=""
            disabled={selectedIds.length === 0 || deleting}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Choose section...</option>

            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Grade {section.grade.level} - {section.label} (
                {section.schoolYear.label})
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={selectedIds.length === 0 || deleting}
            className="rounded-lg bg-[#0f2a47] px-3 py-2 text-sm font-semibold text-white hover:bg-[#163b60] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Assign Section
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0 || deleting}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Roster
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0 || deleting}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={selectedIds.length === 0 || deleting}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Selected"}
          </button>

        </div>
      </div>
    </div>
  );
}
