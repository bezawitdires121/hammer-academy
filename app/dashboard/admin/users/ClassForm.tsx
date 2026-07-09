"use client";

import { useActionState } from "react";
import { createClass } from "./actions";

const initialState: { error: string | undefined; success: boolean } = { error: undefined, success: false };

export default function ClassForm({ teachers }: { teachers: { id: string; fullName: string }[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      const result = await createClass(formData);
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
          Class created successfully.
        </p>
      )}
      <input name="name" placeholder="Class name e.g. Grade 3A" required className="rounded border px-3 py-2" />
      <input name="grade" type="number" min={1} max={5} placeholder="Grade (1-5)" required className="rounded border px-3 py-2" />
      <select name="teacherId" className="rounded border px-3 py-2">
        <option value="">No teacher assigned yet</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>{t.fullName}</option>
        ))}
      </select>
      <button disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-white md:col-span-3 disabled:opacity-50">
        {isPending ? "Creating..." : "Create Class"}
      </button>
    </form>
  );
}