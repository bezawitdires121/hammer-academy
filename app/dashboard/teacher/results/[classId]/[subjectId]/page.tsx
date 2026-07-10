import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SubjectMarksForm from "./SubjectMarksForm";

export default async function SubjectResultsPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const { classId, subjectId } = await params;
  const session = await auth();

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session!.user!.id },
  });

  const assignment = await prisma.classSubjectTeacher.findUnique({
    where: { classId_subjectId: { classId, subjectId } },
    include: { class: true, subject: true },
  });

  if (!assignment || assignment.teacherId !== teacherProfile?.id) {
    redirect("/unauthorized");
  }

  const [students, exams, existingResults] = await Promise.all([
    prisma.student.findMany({
      where: { classId },
      orderBy: { fullName: "asc" },
    }),
    prisma.exam.findMany({ orderBy: { startDate: "desc" } }),
    prisma.result.findMany({
      where: { subjectId, resultCard: { student: { classId } } },
      include: { resultCard: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <a href="/dashboard/teacher" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to your subjects
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {assignment.subject.name} — {assignment.class.name}
        </h1>
      </div>

      <SubjectMarksForm
        classId={classId}
        subjectId={subjectId}
        students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
        exams={exams.map((e) => ({ id: e.id, name: e.name }))}
        existingResults={existingResults.map((r) => ({
          studentId: r.resultCard.studentId,
          examId: r.resultCard.examId,
          marksObtained: r.marksObtained,
          maxMarks: r.maxMarks,
          isLocked: r.resultCard.isLocked,
        }))}
      />
    </div>
  );
}