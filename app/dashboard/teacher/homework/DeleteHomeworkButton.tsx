"use client";

import { useState } from "react";
import { deleteHomework } from "./actions";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";

export default function DeleteHomeworkButton({
  homeworkId,
  isLocked = false,
}: {
  homeworkId: string;
  isLocked?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this homework? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    const result = await deleteHomework(homeworkId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading || isLocked}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Trash2 size={16} />
        )}

        {loading ? "Deleting..." : "Delete"}
      </button>

      {error && (
        <div className="flex max-w-xs items-start gap-1.5 text-right text-xs text-red-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}





