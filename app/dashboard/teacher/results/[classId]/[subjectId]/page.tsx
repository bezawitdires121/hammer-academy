import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SubjectMarksForm from "./SubjectMarksForm";

type Props = {
  params: Promise<{
    classId: string;
    subjectId: string;
  }>;
  searchParams: Promise<{
    semesterId?: string;
  }>;
};

export default async function SubjectResultsPage({
  params,
  searchParams,
}: Props) {
  const { classId, subjectId } = await params;
  const { semesterId } = await searchParams;

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherProfile = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!teacherProfile || teacherProfile.status !== "ACTIVE") {
    redirect("/unauthorized");
  }

  const assignment = await prisma.teacherAssignment.findUnique({
    where: {
      sectionId_subjectId: {
        sectionId: classId,
        subjectId,
      },
    },
    include: {
      section: {
        include: {
          grade: true,
          schoolYear: true,
        },
      },
      subject: true,
    },
  });

  if (!assignment) {
    throw new Error(
      `Teacher assignment not found. sectionId=${classId}, subjectId=${subjectId}`
    );
  }

  if (assignment.teacherId !== teacherProfile.id) {
    throw new Error("You are not assigned to this subject.");
  }

  const section = assignment.section;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      sectionId: section.id,
      status: "ACTIVE",
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          photoUrl: true,
          studentLoginId: true,
        },
      },
    },
    orderBy: {
      student: {
        fullName: "asc",
      },
    },
  });

  const students = enrollments.map(
    (enrollment) => enrollment.student
  );

  const semesters = await prisma.semester.findMany({
    where: {
      schoolYearId: section.schoolYearId,
    },
    orderBy: {
      number: "asc",
    },
    select: {
      id: true,
      name: true,
      number: true,
      isLocked: true,    },
  });

  /*
   * The URL-selected semester is the source of truth.
   * If none was supplied, fall back to the current semester,
   * then the first semester.
   */
  const selectedSemester =
    semesters.find(
      (semester) => semester.id === semesterId
    ) ??
    (await prisma.semester.findFirst({
      where: {
        schoolYearId: section.schoolYearId,
        isCurrent: true,
      },
      select: {
        id: true,
        name: true,
        number: true,
      isLocked: true,      },
    })) ??
    semesters[0] ??
    null;

  /*
   * ONLY load assessments belonging to the selected semester.
   */
  const exams = selectedSemester
    ? await prisma.exam.findMany({
        where: {
          subjectId,
          semesterId: selectedSemester.id,
          semester: {
            schoolYearId: section.schoolYearId,
          },
        },
        include: {
          semester: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            name: "asc",
          },
        ],
      })
    : [];

  const studentIds = students.map(
    (student) => student.id
  );

  const examIds = exams.map(
    (exam) => exam.id
  );

  const existingResults =
    studentIds.length > 0 && examIds.length > 0
      ? await prisma.result.findMany({
          where: {
            subjectId,
            resultCard: {
              studentId: {
                in: studentIds,
              },
              examId: {
                in: examIds,
              },
            },
          },
          include: {
            resultCard: {
              select: {
                studentId: true,
                examId: true,
                isLocked: true,
                status: true,
              },
            },
          },
        })
      : [];

  const isLocked = selectedSemester?.isLocked ?? false;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/teacher/results?schoolYearId=${section.schoolYearId}${
            selectedSemester
              ? `&semesterId=${selectedSemester.id}`
              : ""
          }`}
          className="text-sm font-semibold text-slate-500 transition hover:text-brand-primary"
        >
          ← Back to results
        </Link>

        <div className="mt-3">
          <p className="text-sm font-semibold text-brand-primary">
            Results Entry
          </p>

          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            {assignment.subject.name}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Grade {section.grade.level}
            {section.label} · {section.schoolYear.label}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Subject
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {assignment.subject.name}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Section
            </p>

            <p className="mt-1 font-bold text-slate-900">
              Grade {section.grade.level}
              {section.label}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              School Year
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {section.schoolYear.label}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Semester
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {selectedSemester?.name ?? "No semester"}
            </p>
          </div>
        </div>
      </section>

      {!selectedSemester ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-bold text-slate-900">
            No semester available
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There are no semesters configured for{" "}
            {section.schoolYear.label}.
          </p>
        </section>
      ) : students.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-bold text-slate-900">
            No students enrolled
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There are currently no active students in Grade{" "}
            {section.grade.level}
            {section.label}.
          </p>
        </section>
      ) : (
        <SubjectMarksForm
          isLocked={isLocked}
          classId={classId}
          subjectId={subjectId}
          initialSemesterId={selectedSemester.id}
          semesters={semesters.map((semester) => ({
            id: semester.id,
            name: semester.name,
          }))}
          students={students.map((student) => ({
            id: student.id,
            fullName: student.fullName,
            photoUrl: student.photoUrl,
          }))}
          exams={exams.map((exam) => ({
            id: exam.id,
            name: exam.name,
            semesterId: exam.semesterId,
            maxMarks: exam.maxMarks,
          }))}
          existingResults={existingResults.map((result) => ({
            studentId: result.resultCard.studentId,
            examId: result.resultCard.examId,
            marksObtained: result.marksObtained,
            maxMarks: result.maxMarks,
            isLocked: result.resultCard.isLocked,
          }))}
        />
      )}
    </div>
  );
}





