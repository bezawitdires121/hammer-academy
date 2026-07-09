"use client";

import { useState, useTransition } from "react";
import { editStudent } from "./actions";

export default function StudentRow({
  student,
  classes,
}: {
  student: { id: string; fullName: string; admissionNo: string; classId: string };
  classes: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(student.fullName);
  const [admissionNo, setAdmissionNo] = useState(student.admissionNo);
  const [classId, setClassId] = useState(student.classId);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(undefined);
    const formData = new FormData();
    formData.set("studentId", student.id);
    formData.set("fullName", fullName);
    formData.set("admissionNo", admissionNo);
    formData.set("classId", classId);

    startTransition(async () => {
      const result = await editStudent(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between">
        <span>
          {student.fullName} — {student.admissionNo}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-slate-600 underline hover:text-slate-900"
        >
          Edit
        </button>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded border p-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid gap-2 md:grid-cols-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        />
        <input
          value={admissionNo}
          onChange={(e) => setAdmissionNo(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        />
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded bg-slate-800 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded border px-3 py-1 text-xs text-gray-600"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}