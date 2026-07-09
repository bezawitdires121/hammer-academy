"use client";

import { useState, useTransition } from "react";
import { publishResult, unpublishResult } from "./actions";

export default function ResultActions({
  resultId,
  status,
}: {
  resultId: string;
  status: "DRAFT" | "PUBLISHED";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handlePublish() {
    setError(undefined);
    startTransition(async () => {
      const result = await publishResult(resultId);
      if (result?.error) setError(result.error);
    });
  }

  function handleUnpublish() {
    setError(undefined);
    startTransition(async () => {
      const result = await unpublishResult(resultId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
      {status === "DRAFT" ? (
        <button
          onClick={handlePublish}
          disabled={isPending}
          className="rounded bg-green-600 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          {isPending ? "Publishing..." : "Approve & Publish"}
        </button>
      ) : (
        <button
          onClick={handleUnpublish}
          disabled={isPending}
          className="rounded bg-amber-600 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          {isPending ? "Unpublishing..." : "Unpublish"}
        </button>
      )}
    </div>
  );
}