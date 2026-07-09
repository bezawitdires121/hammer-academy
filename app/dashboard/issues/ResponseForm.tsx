"use client";

import { useState, useTransition } from "react";
import { respondToIssue } from "./actions";

export default function ResponseForm({ issueId }: { issueId: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const formData = new FormData();
    formData.set("issueId", issueId);
    formData.set("message", message);

    startTransition(async () => {
      const result = await respondToIssue(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your response..."
        required
        rows={2}
        className="w-full rounded border px-2 py-1 text-sm"
      />
      <button
        disabled={isPending}
        className="rounded bg-slate-800 px-3 py-1 text-xs text-white disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Send Response"}
      </button>
    </form>
  );
}