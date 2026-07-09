import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ResultForm from "./ResultForm";

export default async function TeacherResultsPage() {
  const session = await auth();

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session!.user!.id },
    include: { classes: { include: { students: true } } },
  });

  const students = teacherProfile?.classes.flatMap((c) => c.students) ?? [];
  const subjects = await prisma.subject.findMany();
  const exams = await prisma.exam.findMany();

  const existingResults = await prisma.result.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    include: { student: true, subject: true, exam: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Enter Results</h1>

      {students.length === 0 ? (
        <p className="text-gray-600">
          You have no assigned classes with students yet. Ask an admin to assign you to a class.
        </p>
      ) : (
        <section className="rounded-lg border bg-white p-6">
          <ResultForm
            students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            exams={exams.map((e) => ({ id: e.id, name: e.name }))}
          />
        </section>
      )}

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Your Entered Results</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Student</th>
              <th>Subject</th>
              <th>Exam</th>
              <th>Marks</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {existingResults.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.student.fullName}</td>
                <td>{r.subject.name}</td>
                <td>{r.exam.name}</td>
                <td>{r.marksObtained}/{r.maxMarks}</td>
                <td>{r.grade}</td>
                <td>
                  <span
                    className={
                      r.status === "PUBLISHED"
                        ? "rounded bg-green-100 px-2 py-1 text-green-700"
                        : "rounded bg-yellow-100 px-2 py-1 text-yellow-700"
                    }
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}