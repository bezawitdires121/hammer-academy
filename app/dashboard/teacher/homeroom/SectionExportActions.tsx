"use client";

import Link from "next/link";
import { useState } from "react";

export default function SectionExportActions({ sectionId }: { sectionId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/teacher/homeroom/${sectionId}/roster`}
        target="_blank"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        🖨 Print Roster
      </Link>

      <div className="flex items-center gap-1.5">
        <input
          type="month"
          value={`${year}-${month}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-");
            setYear(y);
            setMonth(m);
          }}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        />
        <Link
          href={`/dashboard/teacher/homeroom/${sectionId}/attendance-sheet?month=${parseInt(month)}&year=${year}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          🖨 Attendance Sheet
        </Link>
      </div>
    </div>
  );
}
