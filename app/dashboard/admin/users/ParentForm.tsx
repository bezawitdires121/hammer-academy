"use client";

import { useActionState } from "react";
import { createParent } from "./actions";

const initialState: { error: string | undefined; success: boolean } = { error: undefined, success: false };
export default function ParentForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      const result = await createParent(formData);
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
          Parent created successfully.
        </p>
      )}
      <input name="fullName" placeholder="Full name" required className="rounded border px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded border px-3 py-2" />
      <input name="phone" placeholder="Phone (required for SMS)" required className="rounded border px-3 py-2" />
      <input name="password" type="password" placeholder="Temporary password" required minLength={8} className="rounded border px-3 py-2" />
      <button disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-white md:col-span-2 disabled:opacity-50">
        {isPending ? "Creating..." : "Create Parent"}
      </button>
    </form>
  );
}