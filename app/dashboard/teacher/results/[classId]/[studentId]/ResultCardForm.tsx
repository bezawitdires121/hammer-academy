"use client";

import { useState, useMemo } from "react";
import { submitResultCard } from "./actions";

type Subject = { id: string; name: string };
type Exam = { id: string; name: string };
type ExistingCard = {
  examId: string;
  status: string;
  remarks: string | null;
  results: { subjectId: string; marksObtained: number; maxMarks: number }[];
};

export default function ResultCardForm({
  studentId,
  subjects,
  exams,
  existingCards,
}: {
  studentId: string;
  subjects: Subject[];
  exams: Exam[];
  existingCards: ExistingCard[];
}) {
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [remarks, setRemarks] = useState("");
  const [marks, setMarks] = useState<Record<string, { obtained: string; max: string }>>(
    Object.fromEntries(subjects.map((s) => [s.id, { obtained: "", max: "100" }]))
  );
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const currentCard = useMemo(
    () => existingCards.find((c) => c.examId === examId),
    [examId, existingCards]
  );

  const isLocked = currentCard?.status === "PUBLISHED";

  function handleExamChange(newExamId: string) {
    setExamId(newExamId);
    setSuccess(false);
    setError(undefined);

    const card = existingCards.find((c) => c.examId === newExamId);
    if (card) {
      setRemarks(card.remarks ?? "");
      const filled = Object.fromEntries(
        subjects.map((s) => {
          const existing = card.results.find((r) => r.subjectId === s.id);
          return [
            s.id,
            {
              obtained: existing ? String(existing.marksObtained) : "",
              max: existing ? String(existing.maxMarks) : "100",
            },
          ];
        })
      );
      setMarks(filled);
    } else {
      setRemarks("");
      setMarks(Object.fromEntries(subjects.map((s) => [s.id, { obtained: "", max: "100" }])));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setIsPending(true);

    const subjectMarks = subjects
      .filter((s) => marks[s.id]?.obtained !== "")
      .map((s) => ({
        subjectId: s.id,
        marksObtained: Number(marks[s.id].obtained),
        maxMarks: Number(marks[s.id].max),
      }));

    if (subjectMarks.length === 0) {
      setError("Enter at least one subject's marks.");
      setIsPending(false);
      return;
    }

    const formData = new FormData();
    formData.set(
      "payload",
      JSON.stringify({ studentId, examId, remarks, subjectMarks })
    );

    const result = await submitResultCard(formData);
    setIsPending(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-white p-6">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved as draft.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Result Type</label>
        <select
          value={examId}
          onChange={(e) => handleExamChange(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>{exam.name}</option>
          ))}
        </select>
        {currentCard && (
          <p className="mt-1 text-xs text-gray-500">
            Status: <span className={currentCard.status === "PUBLISHED" ? "text-green-600" : "text-yellow-600"}>
              {currentCard.status}
            </span>
          </p>
        )}
      </div>

      {isLocked ? (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          This report card is published and locked. Contact admin to unpublish before making changes.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Subject Marks</p>
            {subjects.map((subject) => (
              <div key={subject.id} className="grid grid-cols-3 items-center gap-3">
                <span className="text-sm text-gray-600">{subject.name}</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Marks obtained"
                  value={marks[subject.id]?.obtained ?? ""}
                  onChange={(e) =>
                    setMarks((prev) => ({
                      ...prev,
                      [subject.id]: { ...prev[subject.id], obtained: e.target.value },
                    }))
                  }
                  className="rounded border px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Out of"
                  value={marks[subject.id]?.max ?? "100"}
                  onChange={(e) =>
                    setMarks((prev) => ({
                      ...prev,
                      [subject.id]: { ...prev[subject.id], max: e.target.value },
                    }))
                  }
                  className="rounded border px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <button
            disabled={isPending}
            className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Draft"}
          </button>
        </>
      )}
    </form>
  );
}