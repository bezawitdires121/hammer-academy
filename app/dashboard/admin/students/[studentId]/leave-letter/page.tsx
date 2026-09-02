import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import LeaveLetterForm from "./LeaveLetterForm";

type Props = {
  params: Promise<{ studentId: string }>;
};

export default async function LeaveLetterPage({ params }: Props) {
  const { studentId } = await params;

  const [student, schoolSettings] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parentContacts: true,
        enrollments: {
          include: {
            schoolYear: true,
            section: {
              include: { grade: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.schoolSettings.findUnique({
      where: { id: 1 },
    }),
  ]);

  if (!student) notFound();

  const enrollment =
    student.enrollments.find((e) => e.schoolYear.isCurrent) ??
    student.enrollments[0];

  const guardian = student.parentContacts[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-5xl px-4 py-6 print:hidden">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href={`/dashboard/admin/students/${student.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0f2a47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Student
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Student Leave Letter
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            ?????? ?? ???
          </p>
        </div>
      </div>

      <LeaveLetterForm
        student={{
          fullName: student.fullName,
          studentLoginId: student.studentLoginId,
          age: student.age,
          gender: student.gender,
          guardianName: guardian?.fullName ?? "",
          guardianRelationship: guardian?.relationship ?? "",
          guardianPhone: guardian?.phone ?? "",
          grade: enrollment
            ? String(enrollment.section.grade.level)
            : "",
          section: enrollment?.section.label ?? "",
          schoolYear: enrollment?.schoolYear.label ?? "",
        }}
        school={{
          schoolName: schoolSettings?.schoolName || "Level UP Academy",
          address: schoolSettings?.address || "",
          phone: schoolSettings?.phone || "",
          email: schoolSettings?.email || "",
          logoUrl: schoolSettings?.logoUrl ?? null,
          stampUrl: schoolSettings?.stampUrl ?? null,
          directorName: schoolSettings?.directorName || "",
          directorSignatureUrl:
            schoolSettings?.directorSignatureUrl ?? null,
        }}
      />
    </div>
  );
}
