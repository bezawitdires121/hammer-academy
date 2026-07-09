"use client";

import { useActionState } from "react";
import { submitIssue } from "./actions";

type FormState = { error: string | undefined; success: boolean };
const initialState: FormState = { error: undefined, success: false };

export default function IssueForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      const result = await submitIssue(formData);
      return { error: result?.error, success: !!result?.success };
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Your message has been sent to the school. You'll be notified when they respond.
        </p>
      )}
      <textarea
        name="message"
        placeholder="Describe your issue or question..."
        required
        rows={4}
        className="w-full rounded border px-3 py-2"
      />
      <button disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50">
        {isPending ? "Sending..." : "Submit"}
      </button>
    </form>
  );
}