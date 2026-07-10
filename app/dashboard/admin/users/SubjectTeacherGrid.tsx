"use client";

import { useState, useTransition } from "react";
import { assignSubjectTeacher } from "./actions";

type Cell = { classId: string; subjectId: string; teacherId: string | null };

export default function SubjectTeacherGrid({
  classes,
  subjects,
  teachers,
  assignments,
}: {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
  assignments: Cell[];
}) {
  const [grid, setGrid] = useState<Record<string, string>>(
    Object.fromEntries(
      assignments.map((a) => [`${a.classId}-${a.subjectId}`, a.teacherId ?? ""])
    )
  );
  const [isPending, startTransition] = useTransition();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function handleChange(classId: string, subjectId: string, teacherId: string) {
    const key = `${classId}-${subjectId}`;
    setGrid((prev) => ({ ...prev, [key]: teacherId }));
    setSavingKey(key);

    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("subjectId", subjectId);
    formData.set("teacherId", teacherId);

    startTransition(async () => {
      await assignSubjectTeacher(formData);
      setSavingKey(null);
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4">Class</th>
            {subjects.map((s) => (
              <th key={s.id} className="px-2 py-2">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr key={cls.id} className="border-b">
              <td className="py-2 pr-4 font-medium text-gray-900">{cls.name}</td>
              {subjects.map((subject) => {
                const key = `${cls.id}-${subject.id}`;
                return (
                  <td key={subject.id} className="px-2 py-2">
                    <select
                      value={grid[key] ?? ""}
                      onChange={(e) => handleChange(cls.id, subject.id, e.target.value)}
                      disabled={isPending && savingKey === key}
                      className="w-full rounded border px-2 py-1 text-xs"
                    >
                      <option value="">— None —</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.fullName}</option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}