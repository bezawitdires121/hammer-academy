"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AcademicSelector from "./AcademicSelector";
import { Role } from "@/lib/roles";

type SemesterOption = {
  id: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
};

type SchoolYearOption = {
  id: string;
  label: string;
  isCurrent: boolean;
  semesters: SemesterOption[];
};

export default function DashboardShell({
  role,
  notificationCount,
  schoolYears,
  children,
}: {
  role: Role;
  notificationCount: number;
  schoolYears?: SchoolYearOption[] | null;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showAcademicSelector =
    (role === "TEACHER" || role === "STUDENT") &&
    Array.isArray(schoolYears);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <Topbar
            role={role}
            notificationCount={notificationCount}
            onMenuClick={() => setSidebarOpen(true)}
          />
        </div>

        {showAcademicSelector && (
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <div className="hidden min-w-0 md:block">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Academic Context
                </p>

                <p className="mt-0.5 text-sm font-semibold text-slate-700">
                  Choose the school year and semester for this dashboard.
                </p>
              </div>

              <div className="ml-auto">
                <AcademicSelector
                  schoolYears={schoolYears ?? []}
                />
              </div>
            </div>
          </div>
        )}

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
