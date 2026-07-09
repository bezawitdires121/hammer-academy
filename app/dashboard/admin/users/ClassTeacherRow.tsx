"use client";

import { useState, useTransition } from "react";
import { assignTeacherToClass } from "./actions";

export default function ClassTeacherRow({
  classId,
  className,
  grade,
  currentTeacherId,
  teachers,
}: {
  classId: string;
  className: string;
  grade: number;
  currentTeacherId: string | null;
  teachers: { id: string; fullName: string }[];
}) {
  const [selected, setSelected] = useState(currentTeacherId ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const teacherId = e.target.value;
    setSelected(teacherId);
    setMessage(undefined);

    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("teacherId", teacherId);

    startTransition(async () => {
      const result = await assignTeacherToClass(formData);
      if (result?.error) {
        setMessage(result.error);
      } else {
        setMessage("Saved.");
        setTimeout(() => setMessage(undefined), 2000);
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
      <span>{className} (Grade {grade})</span>
      <div className="flex items-center gap-2">
        {message && <span className="text-xs text-gray-500">{message}</span>}
        <select
          value={selected}
          onChange={handleChange}
          disabled={isPending}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="">Unassigned</option>
          {teachers.map((t: { id: string; fullName: string }) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>
      </div>
    </div>
  );
}