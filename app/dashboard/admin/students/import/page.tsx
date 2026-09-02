"use client";

import { useState } from "react";

export default function ImportPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const fd = new FormData(e.currentTarget as HTMLFormElement);

    const res = await fetch("/api/admin/students/import", {
      method: "POST",
      body: fd,
    });

    const json = await res.json();
    if (res.ok) {
      setResults(json);
      setStatus(`Imported ${json.importedCount} students; ${json.errors?.length || 0} errors`);
    } else setStatus(json.error || "Import failed");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Students (CSV)</h1>
        <p className="text-sm text-gray-600">Upload a CSV with columns: fullName,studentLoginId,sectionId,parentFullName,parentPhone,parentEmail</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <input type="file" name="file" accept="text/csv" required />
        <div className="mt-4">
          <button className="rounded bg-[#0f2a47] px-4 py-2 text-white">Upload CSV</button>
        </div>

        {status && <p className="mt-3 text-sm text-gray-700">{status}</p>}

        {results?.errors?.length > 0 && (
          <div className="mt-3 rounded border bg-red-50 p-3 text-sm text-red-700">
            <strong className="block">Errors:</strong>
            <ul className="mt-2 list-disc pl-5">
              {results.errors.map((e: any, idx: number) => (
                <li key={idx}>Line {e.line}: {e.error} — {e.row}</li>
              ))}
            </ul>
          </div>
        )}

        {results?.imported?.length > 0 && (
          <div className="mt-3 rounded border bg-green-50 p-3 text-sm text-green-700">
            <strong className="block">Imported IDs:</strong>
            <ul className="mt-2 list-disc pl-5">
              {results.imported.map((r: any) => (
                <li key={r.line}>Line {r.line}: {r.studentLoginId} → {r.studentId}</li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
