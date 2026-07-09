import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ClassResultsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const session = await auth();

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session!.user!.id },
  });

  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      students: { orderBy: { fullName: "asc" } },
    },
  });

  if (!targetClass) {
    redirect("/dashboard/teacher");
  }

  // Security: a teacher can only manage results for their own assigned class
  if (targetClass.teacherId !== teacherProfile?.id) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <div>
        <a href="/dashboard/teacher" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to classes
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {targetClass.name} — Manage Results
        </h1>
      </div>

      {targetClass.students.map((student) => (
  <a
    key={student.id}
    href={`/dashboard/teacher/results/${classId}/${student.id}`}
    className="flex items-center justify-between border-b px-5 py-4 last:border-b-0 hover:bg-gray-50"
  >
    <span className="text-gray-900">{student.fullName}</span>
    <span className="text-sm text-gray-400">
      {student.admissionNo} →
    </span>
  </a>
))}
        </div>
      )}
    
  
