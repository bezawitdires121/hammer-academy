"use client";

type Group = {
  sectionId: string;
  sectionLabel: string;
  gradeLevel: number;
  schoolYear: string;
  examId: string;
  examName: string;
  status: "DRAFT" | "PUBLISHED" | "MIXED";
  students: {
    studentId: string;
    name: string;
    results: {
      subject: string;
      marks: string;
      grade: string;
    }[];
  }[];
};

export default function SectionExamGroup({
  group,
}: {
  group: Group;
}) {
  const studentsWithResults = group.students.filter(
    (student) => student.results.length > 0
  ).length;

  const totalStudents = group.students.length;

  const statusLabel =
    group.status === "PUBLISHED"
      ? "Published"
      : group.status === "MIXED"
        ? "Mixed"
        : "In progress";

  const statusClass =
    group.status === "PUBLISHED"
      ? "bg-green-100 text-green-700"
      : group.status === "MIXED"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Grade {group.gradeLevel}
                {group.sectionLabel} — {group.examName}
              </h2>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              School Year {group.schoolYear}
            </p>
          </div>

          {/* Monitoring summary */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-2 text-right">
              <p className="text-xs text-slate-400">
                Students with results
              </p>

              <p className="text-sm font-bold text-slate-800">
                {studentsWithResults} / {totalStudents}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Students */}
      <div className="p-6">
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-700">
            Student Results
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            Results entered by assigned subject teachers.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="divide-y divide-slate-100">
            {group.students.map((student, index) => (
              <div
                key={`${student.studentId}-${index}`}
                className="px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">
                    {student.name}
                  </p>

                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      student.results.length > 0
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {student.results.length > 0
                      ? "Results entered"
                      : "No results"}
                  </span>
                </div>

                {student.results.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">
                    No subject results have been entered yet.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[500px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left">
                          <th className="pb-2 pr-4 font-semibold text-slate-500">
                            Subject
                          </th>

                          <th className="pb-2 pr-4 font-semibold text-slate-500">
                            Marks
                          </th>

                          <th className="pb-2 font-semibold text-slate-500">
                            Grade
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {student.results.map((result) => (
                          <tr
                            key={result.subject}
                            className="border-b border-slate-50 last:border-0"
                          >
                            <td className="py-2.5 pr-4 font-medium text-slate-700">
                              {result.subject}
                            </td>

                            <td className="py-2.5 pr-4 text-slate-600">
                              {result.marks}
                            </td>

                            <td className="py-2.5 font-semibold text-slate-700">
                              {result.grade || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}