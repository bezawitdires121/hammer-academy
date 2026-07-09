"use client";

import { useActionState } from "react";
import { createResult } from "./actions";

type FormState = { error: string | undefined; success: boolean };
const initialState: FormState = { error: undefined, success: false };

export default function ResultForm({
  students,
  subjects,
  exams,
}: {
  students: { id: string; fullName: string }[];
  subjects: { id: string; name: string }[];
  exams: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      const result = await createResult(formData);
      return { error: result?.error, success: !!result?.success };
    },
    initialState
  );

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-3">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-3">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-3">
          Result saved as draft.
        </p>
      )}
      <select name="studentId" required className="rounded border px-3 py-2">
        <option value="">Select student</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>{s.fullName}</option>
        ))}
      </select>
      <select name="subjectId" required className="rounded border px-3 py-2">
        <option value="">Select subject</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select name="examId" required className="rounded border px-3 py-2">
        <option value="">Select exam</option>
        {exams.map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
      <input name="marksObtained" type="number" min={0} placeholder="Marks obtained" required className="rounded border px-3 py-2" />
      <input name="maxMarks" type="number" min={1} defaultValue={100} placeholder="Max marks" className="rounded border px-3 py-2" />
      <button disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50">
        {isPending ? "Saving..." : "Save Draft"}
      </button>
    </form>
  );
}