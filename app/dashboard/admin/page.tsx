import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [userCount, studentCount, pendingResults, openIssues] =
    await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.result.count({ where: { status: "DRAFT" } }),
      prisma.parentIssue.count({ where: { status: "OPEN" } }),
    ]);

  const cards = [
    { label: "Total Users", value: userCount },
    { label: "Total Students", value: studentCount },
    { label: "Results Awaiting Approval", value: pendingResults },
    { label: "Open Parent Issues", value: openIssues },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Admin Overview
      </h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        
         <a href="/dashboard/admin/users"
          className="inline-block rounded bg-slate-800 px-4 py-2 text-white"
        >
          Manage Users →
        </a>
        
        <a  href="/dashboard/admin/results"
          className="inline-block rounded bg-slate-800 px-4 py-2 text-white"
        >
          Review Results →
        </a>
        
         <a href="/dashboard/admin/audit-log"
          className="inline-block rounded bg-slate-800 px-4 py-2 text-white"
        >
          Audit Log →
        </a>
      </div>
    </div>
  );
}