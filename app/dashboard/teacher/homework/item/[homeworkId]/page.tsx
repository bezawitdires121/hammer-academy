import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EditHomeworkForm from "../../EditHomeworkForm";

type Props = {
  params: Promise<{
    homeworkId: string;
  }>;
};

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function EditHomeworkPage({
  params,
}: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER") {
    redirect("/unauthorized");
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!teacher) {
    redirect("/unauthorized");
  }

  const { homeworkId } = await params;

  const homework =
    await prisma.homework.findUnique({
      where: {
        id: homeworkId,
      },
    });

  if (!homework) {
    notFound();
  }

  if (homework.teacherId !== teacher.id) {
    redirect("/unauthorized");
  }

  const assignments =
    await prisma.teacherAssignment.findMany({
      where: {
        teacherId: teacher.id,
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
      orderBy: [
        {
          section: {
            schoolYear: {
              label: "desc",
            },
          },
        },
        {
          section: {
            grade: {
              level: "asc",
            },
          },
        },
        {
          section: {
            label: "asc",
          },
        },
        {
          subject: {
            name: "asc",
          },
        },
      ],
    });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/teacher/homework"
          className="text-sm font-semibold text-brand-primary hover:underline"
        >
          ← Back to Homework
        </Link>

        <h1 className="mt-3 text-2xl font-black text-gray-900">
          Edit Homework
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Update the homework assignment and save
          your changes.
        </p>
      </div>

      <div className="border border-gray-200 bg-white p-5 shadow-sm">
        <EditHomeworkForm
          assignments={assignments}
          onClose={() => {}}
          homework={{
            id: homework.id,
            title: homework.title,
            instructions:
              homework.instructions,
            source: homework.source,
            textbookName:
              homework.textbookName,
            pageNumber:
              homework.pageNumber,
            exercises:
              homework.exercises,
            sourceNote:
              homework.sourceNote,
            assignedDate:
              formatDateForInput(
                homework.assignedDate
              ),
            dueDate: homework.dueDate
              ? formatDateForInput(
                  homework.dueDate
                )
              : null,
            sectionId:
              homework.sectionId,
            subjectId:
              homework.subjectId,
            semesterId:
              homework.semesterId ?? "",
          }}
        />
      </div>
    </div>
  );
}





