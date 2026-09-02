import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { prisma } from "@/lib/prisma";

export default async function AdminActivityPage() {
  const logs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          email: true,
          adminProfile: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-primary">
          Activity
        </h1>

        <p className="text-sm text-gray-500">
          Recent actions performed in the school system.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {log.action}
                  </p>

                  <p className="text-sm text-gray-500">
                    {log.user?.adminProfile?.fullName ||
                      log.user?.email ||
                      "System Admin"}
                  </p>

                  <p className="text-xs text-gray-400">
                    {log.entity} · {log.entityId}
                  </p>
                </div>

                <div className="text-xs text-gray-400">
                  {formatEthiopianDisplay(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

