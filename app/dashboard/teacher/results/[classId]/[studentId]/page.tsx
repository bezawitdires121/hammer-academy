import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ResultCardForm from "./ResultCardForm";

export default async function StudentResultEntryPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId, studentId } = await params;
  const session = await auth();

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session!.user!.id },
  });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });

  if (!student || student.class.teacherId !== teacherProfile?.id) {
    redirect("/unauthorized");
  }

  const [subjects, exams, existingCards] = await Promise.all([
    prisma.subject.findMany(),
    prisma.exam.findMany({ orderBy: { startDate: "desc" } }),
    prisma.resultCard.findMany({
      where: { studentId },
      include: { results: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <a
          href={`/dashboard/teacher/results/${classId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to {student.class.name}
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {student.fullName}
        </h1>
        <p className="text-sm text-gray-500">Admission No. {student.admissionNo}</p>
      </div>

      <ResultCardForm
        studentId={studentId}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        exams={exams.map((e) => ({ id: e.id, name: e.name }))}
        existingCards={existingCards.map((c) => ({
          examId: c.examId,
          status: c.status,
          remarks: c.remarks,
          results: c.results.map((r) => ({
            subjectId: r.subjectId,
            marksObtained: r.marksObtained,
            maxMarks: r.maxMarks,
          })),
        }))}
      />
    </div>
  );
}