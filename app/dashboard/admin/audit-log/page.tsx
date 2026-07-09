import { prisma } from "@/lib/prisma";

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100, // most recent 100 — enough for review without overwhelming the page
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
      <p className="text-sm text-gray-500">
        A permanent record of sensitive actions taken by admins and teachers. Showing the most recent 100 entries.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: (typeof logs)[number]) => (
              <tr key={log.id} className="border-b">
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-2">{log.user.email}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {log.entity} ({log.entityId.slice(0, 8)}...)
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}