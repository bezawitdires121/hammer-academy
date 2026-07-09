import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function ParentDashboard() {
  const session = await auth();

  const parentProfile = await prisma.parent.findUnique({
    where: { userId: session!.user!.id },
    include: {
      students: {
        include: {
          student: {
            include: {
              class: true,
              // CRITICAL: only ever fetch PUBLISHED results here — a parent
              // must never be able to see a draft result under any condition
              results: {
                where: { status: "PUBLISHED" },
                include: { subject: true, exam: true },
                orderBy: { publishedAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  const children = parentProfile?.students.map((ps) => ps.student) ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">
        Your Children
      </h1>

      {children.length === 0 ? (
        <p className="text-gray-600">
          No children are linked to your account yet. Contact the school office if this seems wrong.
        </p>
      ) : (
        children.map((child) => (
          <section key={child.id} className="rounded-lg border bg-white p-6">
            <h2 className="mb-1 font-medium text-gray-900">
              {child.fullName}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {child.class.name} (Grade {child.class.grade}) — Admission No. {child.admissionNo}
            </p>

            {child.results.length === 0 ? (
              <p className="text-sm text-gray-500">
                No published results yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">Subject</th>
                    <th>Exam</th>
                    <th>Marks</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {child.results.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2">{r.subject.name}</td>
                      <td>{r.exam.name}</td>
                      <td>{r.marksObtained}/{r.maxMarks}</td>
                      <td className="font-medium">{r.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}
    </div>
  );
}