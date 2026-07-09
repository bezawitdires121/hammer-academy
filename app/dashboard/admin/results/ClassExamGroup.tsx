"use client";

import { useState, useTransition } from "react";
import { publishClassResults, unpublishClassResults } from "./actions";

type Group = {
  classId: string;
  className: string;
  examId: string;
  examName: string;
  status: "DRAFT" | "PUBLISHED" | "MIXED";
  students: { name: string; results: { subject: string; marks: string; grade: string }[] }[];
};

export default function ClassExamGroup({ group }: { group: Group }) {
  const [status, setStatus] = useState(group.status);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    setError(undefined);
    startTransition(async () => {
      const result = await publishClassResults(group.classId, group.examId);
      if (result?.error) {
        setError(result.error);
      } else {
        setStatus("PUBLISHED");
        setMessage(`Published ${result.count} student result(s).`);
      }
    });
  }

  function handleUnpublish() {
    setError(undefined);
    startTransition(async () => {
      const result = await unpublishClassResults(group.classId, group.examId);
      if (result?.error) {
        setError(result.error);
      } else {
        setStatus("DRAFT");
        setMessage(`Unpublished ${result.count} student result(s).`);
      }
    });
  }

  return (
    <section className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">
            {group.className} — {group.examName}
          </h2>
          <span
            className={
              status === "PUBLISHED"
                ? "text-xs text-green-600"
                : status === "MIXED"
                ? "text-xs text-amber-600"
                : "text-xs text-yellow-600"
            }
          >
            {status === "MIXED" ? "Some published, some draft" : status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {message && <span className="text-xs text-gray-500">{message}</span>}
          {status !== "PUBLISHED" && (
            <button
              onClick={handlePublish}
              disabled={isPending}
              className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isPending ? "Publishing..." : "Approve & Publish Class"}
            </button>
          )}
          {status !== "DRAFT" && (
            <button
              onClick={handleUnpublish}
              disabled={isPending}
              className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isPending ? "Unpublishing..." : "Unpublish Class"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {group.students.map((s) => (
          <div key={s.name} className="border-t pt-3 first:border-t-0 first:pt-0">
            <p className="font-medium text-gray-900">{s.name}</p>
            <ul className="pl-4 text-sm text-gray-600">
              {s.results.map((r) => (
                <li key={r.subject}>
                  {r.subject}: {r.marks} ({r.grade})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}