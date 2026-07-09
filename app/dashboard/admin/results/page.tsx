import { prisma } from "@/lib/prisma";
import ResultActions from "./ResultActions";

export default async function AdminResultsPage() {
  const results = await prisma.result.findMany({
    include: { student: true, subject: true, exam: true, enteredBy: true },
    orderBy: { createdAt: "desc" },
  });
const drafts = results.filter((r: (typeof results)[number]) => r.status === "DRAFT");
  const published = results.filter((r: (typeof results)[number]) => r.status === "PUBLISHED");

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-gray-900">Results Review</h1>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">
          Awaiting Approval ({drafts.length})
        </h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-gray-500">No results waiting for approval.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Student</th>
                <th>Subject</th>
                <th>Exam</th>
                <th>Marks</th>
                <th>Grade</th>
                <th>Entered By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2">{r.student.fullName}</td>
                  <td>{r.subject.name}</td>
                  <td>{r.exam.name}</td>
                  <td>{r.marksObtained}/{r.maxMarks}</td>
                  <td>{r.grade}</td>
                  <td>{r.enteredBy.fullName}</td>
                  <td>
                    <ResultActions resultId={r.id} status="DRAFT" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">
          Published ({published.length})
        </h2>
        {published.length === 0 ? (
          <p className="text-sm text-gray-500">No published results yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Student</th>
                <th>Subject</th>
                <th>Exam</th>
                <th>Marks</th>
                <th>Grade</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {published.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2">{r.student.fullName}</td>
                  <td>{r.subject.name}</td>
                  <td>{r.exam.name}</td>
                  <td>{r.marksObtained}/{r.maxMarks}</td>
                  <td>{r.grade}</td>
                  <td>{r.publishedAt?.toLocaleDateString()}</td>
                  <td>
                    <ResultActions resultId={r.id} status="PUBLISHED" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}