"use client";

import { useState, useMemo } from "react";
import { submitSubjectMarks } from "./actions";

type Student = { id: string; fullName: string };
type Exam = { id: string; name: string };
type ExistingResult = {
  studentId: string;
  examId: string;
  marksObtained: number;
  maxMarks: number;
  isLocked: boolean;
};

export default function SubjectMarksForm({
  classId,
  subjectId,
  students,
  exams,
  existingResults,
}: {
  classId: string;
  subjectId: string;
  students: Student[];
  exams: Exam[];
  existingResults: ExistingResult[];
}) {
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [marks, setMarks] = useState<Record<string, { obtained: string; max: string }>>({});
  const [error, setError] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const lockedStudentIds = useMemo(
    () =>
      new Set(
        existingResults
          .filter((r) => r.examId === examId && r.isLocked)
          .map((r) => r.studentId)
      ),
    [examId, existingResults]
  );

  function handleExamChange(newExamId: string) {
    setExamId(newExamId);
    setSuccess(false);
    setError(undefined);
    const filled: Record<string, { obtained: string; max: string }> = {};
    for (const student of students) {
      const existing = existingResults.find(
        (r) => r.studentId === student.id && r.examId === newExamId
      );
      filled[student.id] = {
        obtained: existing ? String(existing.marksObtained) : "",
        max: existing ? String(existing.maxMarks) : "100",
      };
    }
    setMarks(filled);
  }

  useState(() => {
    handleExamChange(examId);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setWarning(undefined);
    setIsPending(true);

    const entries = students
      .filter((s) => marks[s.id]?.obtained !== "" && marks[s.id]?.obtained !== undefined)
      .map((s) => ({
        studentId: s.id,
        marksObtained: Number(marks[s.id].obtained),
        maxMarks: Number(marks[s.id].max || "100"),
      }));

    if (entries.length === 0) {
      setError("Enter at least one student's marks.");
      setIsPending(false);
      return;
    }

    const formData = new FormData();
    formData.set("payload", JSON.stringify({ classId, subjectId, examId, entries }));

    const result = await submitSubjectMarks(formData);
    setIsPending(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      if (result.warning) setWarning(result.warning);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {warning && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</p>
      )}
      {success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Marks saved as draft.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Result Type</label>
        <select
          value={examId}
          onChange={(e) => handleExamChange(e.target.value)}
          className="mt-1 w-full max-w-xs rounded border px-3 py-2"
        >
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>{exam.name}</option>
          ))}
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2">Student</th>
            <th>Marks Obtained</th>
            <th>Out of</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const locked = lockedStudentIds.has(student.id);
            return (
              <tr key={student.id} className="border-b">
                <td className="py-2">{student.fullName}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    disabled={locked}
                    value={marks[student.id]?.obtained ?? ""}
                    onChange={(e) =>
                      setMarks((prev) => ({
                        ...prev,
                        [student.id]: { ...prev[student.id], obtained: e.target.value },
                      }))
                    }
                    className="w-24 rounded border px-2 py-1 disabled:bg-gray-100"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    disabled={locked}
                    value={marks[student.id]?.max ?? "100"}
                    onChange={(e) =>
                      setMarks((prev) => ({
                        ...prev,
                        [student.id]: { ...prev[student.id], max: e.target.value },
                      }))
                    }
                    className="w-20 rounded border px-2 py-1 disabled:bg-gray-100"
                  />
                </td>
                <td>
                  {locked && (
                    <span className="text-xs text-amber-600">Published — locked</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        disabled={isPending}
        className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Draft for All Students"}
      </button>
    </form>
  );
}