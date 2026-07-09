import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function TeacherResultsOverviewPage() {
  const session = await auth();

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session!.user!.id },
    include: {
      classes: {
        include: {
          students: {
            include: {
              resultCards: {
                include: { exam: true, results: { include: { subject: true } } },
              },
            },
            orderBy: { fullName: "asc" },
          },
        },
      },
    },
  });

  const classes = teacherProfile?.classes ?? [];

  return (
    <div className="space-y-10">
      <div>
        <a href="/dashboard/teacher" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to classes
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Entered Results</h1>
      </div>

      {classes.map((cls) => {
        // Group this class's result cards by exam (result type)
        const examGroups = new Map<
  string,
  {
    examName: string;
    entries: {
      studentName: string;
      card: (typeof cls.students)[number]["resultCards"][number];
    }[];
  }
>();

        for (const student of cls.students) {
          for (const card of student.resultCards) {
            const key = card.examId;
            if (!examGroups.has(key)) {
              examGroups.set(key, { examName: card.exam.name, entries: [] });
            }
            examGroups.get(key)!.entries.push({ studentName: student.fullName, card });
          }
        }

        if (examGroups.size === 0) return null;

        return (
          <section key={cls.id} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{cls.name}</h2>

            {Array.from(examGroups.values()).map((group) => (
              <div key={group.examName} className="rounded-lg border bg-white p-5">
                <h3 className="mb-3 font-medium text-gray-800">{group.examName}</h3>

                <div className="space-y-3">
                  {group.entries.map(({ studentName, card }) => (
                    <div key={card.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{studentName}</span>
                        <span
                          className={
                            card.status === "PUBLISHED"
                              ? "rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                              : "rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700"
                          }
                        >
                          {card.status}
                        </span>
                      </div>
                      <ul className="mt-1 pl-4 text-sm text-gray-600">
                        {card.results.map((r) => (
                          <li key={r.id}>
                            {r.subject.name}: {r.marksObtained}/{r.maxMarks} ({r.grade})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {classes.every((c) => c.students.every((s) => s.resultCards.length === 0)) && (
        <p className="text-gray-500">No results entered yet.</p>
      )}
    </div>
  );
}