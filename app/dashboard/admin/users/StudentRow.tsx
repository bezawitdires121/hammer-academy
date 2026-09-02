"use client";

import { useState, useTransition } from "react";
import { editStudent } from "./actions";

type Student = {
  id: string;
  fullName: string;
  studentLoginId: string;
  sectionId: string;
};

type Section = {
  id: string;
  name: string;
};

export default function StudentRow({
  student,
  classes,
}: {
  student: Student;
  classes: Section[];
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(student.fullName);
  const [sectionId, setSectionId] = useState(student.sectionId);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(undefined);

    const formData = new FormData();
    formData.set("studentId", student.id);
    formData.set("fullName", fullName);
    formData.set("sectionId", sectionId);

    startTransition(async () => {
      const result = await editStudent(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setEditing(false);

      // Refresh the server-rendered student list.
      window.location.reload();
    });
  }

  if (editing) {
    return (
      <div className="space-y-2 text-left">
        {error && (
          <p className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-600">
            {error}
          </p>
        )}

        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
          placeholder="Student name"
        />

        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#0f2a47]"
        >
          {classes.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(undefined);
              setFullName(student.fullName);
              setSectionId(student.sectionId);
            }}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !fullName.trim() || !sectionId}
            className="rounded-md bg-[#0f2a47] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0b2138] disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-[#0f2a47] hover:bg-gray-50 hover:text-[#0f2a47]"
      >
        Edit
      </button>
    </div>
  );
}