import StudentForm from "@/app/dashboard/admin/users/StudentForm";
import { prisma } from "@/lib/prisma";

export default async function EnrollPage() {
  const sections = await prisma.section.findMany({
    include: { grade: true, schoolYear: true },
    orderBy: [{ grade: { level: "asc" } }, { label: "asc" }],
  });

  const choices = sections.map((s) => ({
    id: s.id,
    name: `Grade ${s.grade.level} — ${s.label} (${s.schoolYear.label})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enroll Student</h1>
        <p className="text-sm text-gray-600">Add a new student and optional guardian contact.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* StudentForm is a client component that uses the server action in users/actions.ts */}
       
        <StudentForm sections={choices} />
      </div>
    </div>
  );
}
