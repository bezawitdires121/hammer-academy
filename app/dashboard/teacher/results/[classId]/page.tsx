import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ClassResultsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const teacherProfile = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!teacherProfile || teacherProfile.status !== "ACTIVE") {
    redirect('/unauthorized');
  }

  /*
   * The current database uses Section instead of Class.
   *
   * A teacher is allowed to manage results for a section
   * only when they have a TeacherAssignment for that
   * section.
   */
  const section = await prisma.section.findUnique({
    where: {
      id: classId,
    },
    include: {
      grade: true,
      schoolYear: true,
      enrollments: {
        include: {
          student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } },
        },
      },
      subjectAssignments: {
        where: {
          teacherId: teacherProfile.id,
        },
        include: {
          subject: true,
        },
      },
    },
  });

  if (!section) {
    redirect("/dashboard/teacher");
  }

  /*
   * Security:
   * the teacher must actually be assigned to this section.
   */
  if (section.subjectAssignments.length === 0) {
    redirect("/unauthorized");
  }

  const students = section.enrollments
    .map((enrollment) => enrollment.student)
    .sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/teacher"
          className="text-sm font-semibold text-gray-500 hover:text-gray-700"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-3 text-2xl font-black text-gray-900">
          {section.grade.level} — Section {section.label}
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {section.schoolYear.label} · Manage Results
        </p>
      </div>

      {/* Assigned Subjects */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">
            Your Subjects
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select a subject to manage student results.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {section.subjectAssignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/dashboard/teacher/results/${classId}/${assignment.subjectId}`}
              className="flex items-center justify-between px-5 py-4 transition hover:bg-gray-50"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {assignment.subject.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Grade {section.grade.level} · Section {section.label}
                </p>
              </div>
              <span className="text-sm font-semibold text-brand-primary">Enter marks →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Students */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">
            Students
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select a student to manage their results.
          </p>
        </div>




        {students.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-semibold text-gray-900">
              No students enrolled
            </p>

            <p className="mt-1 text-sm text-gray-500">
              There are currently no students in this section.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {student.fullName}
                  </p>

                  <p className="mt-0.5 text-sm text-gray-400">
                    {student.studentLoginId}
                  </p>
                </div>
              </div>
            ))}
          </div>
)}



</div>
      
    </div>
  );
}



