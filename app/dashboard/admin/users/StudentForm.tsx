"use client";

import { useActionState } from "react";
import { createStudent } from "./actions";

type FormState = { error: string | undefined; success: boolean };
const initialState: FormState = { error: undefined, success: false };

export default function StudentForm({
  classes,
  parents,
}: {
  classes: { id: string; name: string }[];
  parents: { id: string; fullName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      const result = await createStudent(formData);
      return { error: result?.error, success: !!result?.success };
    },
    initialState
  );

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-2">
          Student enrolled successfully.
        </p>
      )}
      <input name="fullName" placeholder="Student full name" required className="rounded border px-3 py-2" />
      <input name="admissionNo" placeholder="Admission number" required className="rounded border px-3 py-2" />
      <select name="classId" required className="rounded border px-3 py-2">
        <option value="">Select class</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select name="parentId" required className="rounded border px-3 py-2">
        <option value="">Select parent</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>{p.fullName}</option>
        ))}
      </select>
      <button disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-white md:col-span-2 disabled:opacity-50">
        {isPending ? "Enrolling..." : "Enroll Student"}
      </button>
    </form>
  );
}