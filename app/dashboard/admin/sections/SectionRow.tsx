"use client";

import { useState, useTransition } from "react";
import { editSection, deleteSection } from "./actions";

export default function SectionRow({ section, grades, schoolYears }: { section: any; grades: any[]; schoolYears: any[] }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(section.label);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSave() {
    setError(undefined);
    const fd = new FormData();
    fd.set('sectionId', section.id);
    fd.set('label', label);
    startTransition(async () => {
      const res = await editSection(fd);
      if (res?.error) setError(res.error);
      else setEditing(false);
    });
  }

  function handleDelete() {
    setShowConfirm(true);
  }

  async function confirmDelete() {
    const fd = new FormData();
    fd.set('sectionId', section.id);
    await deleteSection(fd);
    setShowConfirm(false);
  }

  return (
    <>
      <li className="space-y-2 rounded border p-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!editing ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{section.grade.level}{section.label} — {section.schoolYear.label}</div>
            <div className="text-sm text-gray-600">ID: {section.id}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="text-xs underline">Edit</button>
            <form action={handleDelete as any}>
              <button type="button" onClick={handleDelete} className="text-xs text-red-600">Delete</button>
            </form>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded border px-2 py-1 text-sm">{section.grade.level}</div>
            <div className="rounded border px-2 py-1 text-sm">{section.schoolYear.label}</div>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded border px-2 py-1 text-sm" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleSave} disabled={isPending} className="rounded bg-slate-800 px-3 py-1 text-xs text-white">{isPending ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(false)} className="rounded border px-3 py-1 text-xs text-gray-600">Cancel</button>
          </div>
        </div>
      )}
      </li>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium">Delete section?</h3>
            <p className="text-sm text-gray-600 mt-2">This will permanently delete the section and all year-scoped references. This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="rounded border px-3 py-1 text-sm">Cancel</button>
              <button onClick={confirmDelete} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
      </>
  );
}
