import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function TeacherDashboard() {
  const session = await auth();

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session!.user!.id },
    include: { classes: true },
  });

  const classes = teacherProfile?.classes ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Your Classes</h1>

      {classes.length === 0 ? (
        <p className="text-gray-600">
          You have no assigned classes yet. Contact an admin to get assigned to a class.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border bg-white p-5"
            >
              <div>
                <p className="font-medium text-gray-900">{c.name}</p>
                
              </div>
              <a
                href={`/dashboard/teacher/results/${c.id}`}
                className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
              >
                Manage Results →
              </a>
            </div>
          ))}
          <a href="/dashboard/teacher/results"
            className="inline-block text-sm text-slate-700 underline"
          >
            View all entered results →
          </a>
        </div>
      )}
    </div>
  );
}