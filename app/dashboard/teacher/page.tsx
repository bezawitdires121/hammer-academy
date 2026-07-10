import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function TeacherDashboard() {
  const session = await auth();

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session!.user!.id },
  });

  const assignments = await prisma.classSubjectTeacher.findMany({
    where: { teacherId: teacherProfile?.id },
    include: { class: true, subject: true },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Your Subjects</h1>
        <a
          href="/dashboard/teacher/results"
          className="text-sm text-slate-700 underline"
        >
          View all entered results →
        </a>
      </div>

      {assignments.length === 0 ? (
        <p className="text-gray-600">
          You have no assigned subjects yet. Contact an admin to get assigned.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border bg-white p-5"
            >
              <div>
                <p className="font-medium text-gray-900">{a.subject.name}</p>
                <p className="text-sm text-gray-500">{a.class.name}</p>
              </div>
              <a
                href={`/dashboard/teacher/results/${a.classId}/${a.subjectId}`}
                className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
              >
                Enter Marks →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}