import { prisma } from "@/lib/prisma";
import ClassExamGroup from "./ClassExamGroup";

export default async function AdminResultsPage() {
  const classes = await prisma.class.findMany({
    include: {
      students: {
        include: {
          resultCards: {
            include: { exam: true, results: { include: { subject: true } } },
          },
        },
      },
    },
  });

  // Build class → exam groups across all classes, same grouping logic
  // as the teacher's view but scoped admin-wide
  const groups: {
    classId: string;
    className: string;
    examId: string;
    examName: string;
    status: "DRAFT" | "PUBLISHED" | "MIXED";
    students: { name: string; results: { subject: string; marks: string; grade: string }[] }[];
  }[] = [];

  for (const cls of classes) {
    const byExam = new Map<string, typeof groups[number]>();

    for (const student of cls.students) {
      for (const card of student.resultCards) {
        const key = card.examId;
        if (!byExam.has(key)) {
          byExam.set(key, {
            classId: cls.id,
            className: cls.name,
            examId: card.examId,
            examName: card.exam.name,
            status: card.status as "DRAFT" | "PUBLISHED",
            students: [],
          });
        }
        const group = byExam.get(key)!;
        if (group.status !== card.status) group.status = "MIXED";
        group.students.push({
          name: student.fullName,
          results: card.results.map((r) => ({
            subject: r.subject.name,
            marks: `${r.marksObtained}/${r.maxMarks}`,
            grade: r.grade ?? "",
          })),
        });
      }
    }

    groups.push(...byExam.values());
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Results Review</h1>

      {groups.length === 0 ? (
        <p className="text-gray-500">No results entered yet.</p>
      ) : (
        groups.map((group) => (
          <ClassExamGroup key={`${group.classId}-${group.examId}`} group={group} />
        ))
      )}
    </div>
  );
}