"use client";

import { useActionState } from "react";
import { createSection } from "./actions";

export default function SectionForm({ grades, schoolYears }: { grades: { id: string; level: number }[]; schoolYears: { id: string; label: string }[] }) {
  const [state, formAction, isPending] = useActionState(async (_prevState: { error?: string; success: boolean }, formData: FormData) => {
    const res = await createSection(formData);
    return { error: res?.error, success: !!res?.success } as any;
  }, { error: undefined, success: false });

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-3">
      {state.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-3">{state.error}</p>}
      {state.success && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-3">Section created.</p>}
      <select name="gradeId" required className="rounded border px-3 py-2">
        <option value="">Select grade</option>
        {grades.map((g) => (<option key={g.id} value={g.id}>{g.level}</option>))}
      </select>
      <select name="schoolYearId" required className="rounded border px-3 py-2">
        <option value="">Select school year</option>
        {schoolYears.map((y) => (<option key={y.id} value={y.id}>{y.label}</option>))}
      </select>
      <input name="label" placeholder="Section label (A, B...)" required className="rounded border px-3 py-2" />
      <button disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-white md:col-span-3 disabled:opacity-50">{isPending ? 'Creating...' : 'Create Section'}</button>
    </form>
  );
}
