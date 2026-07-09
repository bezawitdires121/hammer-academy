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
              // CRITICAL: only ever fetch PUBLISHED cards — a parent must
              // never see a draft report card under any condition
              resultCards: {
                where: { status: "PUBLISHED" },
                include: {
                  exam: true,
                  results: { include: { subject: true } },
                },
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
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-gray-900">Your Children</h1>

      {children.length === 0 ? (
        <p className="text-gray-600">
          No children are linked to your account yet. Contact the school office if this seems wrong.
        </p>
      ) : (
        children.map((child) => (
          <section key={child.id} className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">{child.fullName}</h2>
            <p className="mb-4 text-sm text-gray-500">
              {child.class.name} (Grade {child.class.grade}) — Admission No. {child.admissionNo}
            </p>

            {child.resultCards.length === 0 ? (
              <p className="text-sm text-gray-500">No published results yet.</p>
            ) : (
              <div className="space-y-5">
                {child.resultCards.map((card) => {
                  const average =
                    card.results.length > 0
                      ? (
                          card.results.reduce(
                            (sum, r) => sum + (r.marksObtained / r.maxMarks) * 100,
                            0
                          ) / card.results.length
                        ).toFixed(1)
                      : null;

                  return (
                    <div key={card.id} className="rounded border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{card.exam.name}</p>
                          <p className="text-xs text-gray-400">
                            {card.exam.term} · {card.exam.academicYear} · Published{" "}
                            {card.publishedAt?.toLocaleDateString()}
                          </p>
                        </div>
                        {average && (
                          <span className="rounded bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                            Avg: {average}%
                          </span>
                        )}
                      </div>

                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-1">Subject</th>
                            <th>Marks</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {card.results.map((r) => (
                            <tr key={r.id} className="border-b last:border-b-0">
                              <td className="py-1">{r.subject.name}</td>
                              <td>{r.marksObtained}/{r.maxMarks}</td>
                              <td className="font-medium">{r.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {card.remarks && (
                        <p className="mt-3 rounded bg-gray-50 p-2 text-sm text-gray-700">
                          <span className="font-medium">Teacher's remarks:</span> {card.remarks}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}