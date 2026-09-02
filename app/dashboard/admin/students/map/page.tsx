"use client";

import { useState } from "react";

export default function MapPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setResults([]);

    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await fetch("/api/admin/students/map", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) setStatus(json.error || "Mapping failed");
    else {
      setResults(json.results || []);
      setStatus("Done");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Map Students to Sections (CSV)</h1>
        <p className="text-sm text-gray-600">CSV columns: studentLoginId,sectionId</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <input type="file" name="file" accept="text/csv" required />
        <div className="mt-4">
          <button className="rounded bg-[#0f2a47] px-4 py-2 text-white">Upload CSV</button>
        </div>
      </form>

      {status && <p className="text-sm text-gray-700">{status}</p>}

      {results.length > 0 && (
        <div className="rounded border p-4">
          <h3 className="font-semibold">Results</h3>
          <ul className="mt-2 text-sm">
            {results.map((r: any) => (
              <li key={r.line} className={r.success ? "text-green-700" : "text-red-700"}>
                Line {r.line}: {r.studentLoginId} → {r.sectionId} — {r.success ? "OK" : r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
