"use client";

import { useActionState, useState } from "react";
import { createAnnouncement } from "./actions";

const initialState = { error: undefined, success: false };

export default function AnnouncementForm({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const [scope, setScope] = useState("SCHOOL_WIDE");
  const [state, formAction, isPending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      const result = await createAnnouncement(formData);
      return { error: result?.error, success: !!result?.success };
    },
    initialState
  );

  return (
    <form action={formAction} className="grid gap-3">
      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Announcement posted successfully.
        </p>
      )}
      <input name="title" placeholder="Title" required className="rounded border px-3 py-2" />
      <textarea name="body" placeholder="Message" required rows={4} className="rounded border px-3 py-2" />

      <select
        name="scope"
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        className="rounded border px-3 py-2"
      >
        <option value="SCHOOL_WIDE">School-wide</option>
        <option value="GRADE">Specific grade</option>
        <option value="CLASS">Specific class</option>
      </select>

      {scope === "GRADE" && (
        <select name="grade" required className="rounded border px-3 py-2">
          <option value="">Select grade</option>
          {[1, 2, 3, 4, 5].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      )}

      {scope === "CLASS" && (
        <select name="classId" required className="rounded border px-3 py-2">
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="priority" />
        Mark as priority (urgent notice)
      </label>

      <button disabled={isPending} className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50">
        {isPending ? "Posting..." : "Post Announcement"}
      </button>
    </form>
  );
}