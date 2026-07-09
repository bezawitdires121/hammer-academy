import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherDashboard() {
  const session = await auth();

  const teacher = session?.user?.id
    ? await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        include: {
          classes: {
            orderBy: { name: "asc" },
            include: {
              students: {
                orderBy: { fullName: "asc" },
                select: {
                  id: true,
                  fullName: true,
                  admissionNo: true,
                },
              },
            },
          },
        },
      })
    : null;

  const classes = teacher?.classes ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          Teacher Dashboard
        </h1>
        <p className="text-gray-600">
          Select a class to manage student results.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
          No classes are assigned to you yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <Link
              key={classItem.id}
              href={`/dashboard/teacher/results?classId=${classItem.id}`}
              className="flex flex-col rounded-lg border bg-white p-6 shadow-sm transition hover:border-slate-400 hover:shadow-md"
            >
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {classItem.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Grade {classItem.grade}
                </p>
              </div>
              <div className="mt-auto text-sm text-gray-600">
                {classItem.students.length} student{classItem.students.length !== 1 ? 's' : ''}
              </div>
              <div className="mt-4 inline-block rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
                Manage Results →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}