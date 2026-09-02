import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Search, Users } from "lucide-react";
import { addCondition, removeCondition } from "../actions";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function HealthStudentsPage({ searchParams }: Props) {
  await requireRole(["HEALTH", "ADMIN"]);
  const { q = "" } = await searchParams;

  const students = q
    ? await prisma.student.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { studentLoginId: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          healthConditions: true,
          healthVisits: { orderBy: { visitDate: "desc" }, take: 1 },
          parentContacts: { take: 1 },
          enrollments: {
            include: { section: { include: { grade: true } } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 30,
        orderBy: { fullName: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search students to manage health conditions and record visits.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or student IDâ€¦"
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-primary"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      {!q ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">Search for a student</h2>
          <p className="mt-1 text-sm text-slate-500">Enter a name or student ID.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-slate-500">No students found for &quot;{q}&quot;.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const enrollment = student.enrollments[0];
            const lastVisit = student.healthVisits[0];
            const guardian = student.parentContacts[0];

            return (
              <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{student.fullName}</p>
                    <p className="font-mono text-xs text-slate-400">{student.studentLoginId}</p>
                    {enrollment && (
                      <p className="mt-0.5 text-sm text-slate-500">
                        Grade {enrollment.section.grade.level} â€” {enrollment.section.label}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/dashboard/employee/health/visits?record=1&studentId=${student.id}`}
                    className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Record Visit
                  </a>
                </div>

                {/* Conditions */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Health conditions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {student.healthConditions.map((c) => (
                      <RemoveConditionForm key={c.id} conditionId={c.id} name={c.name} />
                    ))}
                  </div>
                  <AddConditionForm studentId={student.id} />
                </div>

                {lastVisit && (
                  <p className="mt-3 text-xs text-slate-400">
                    Last visit: {formatEthiopianDisplay(lastVisit.visitDate)} â€”{" "}
                    {lastVisit.reason ?? "No reason recorded"}
                  </p>
                )}
                {guardian && (
                  <p className="mt-1 text-xs text-slate-400">
                    Guardian: {guardian.fullName}
                    {guardian.phone && ` Â· ${guardian.phone}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RemoveConditionForm({ conditionId, name }: { conditionId: string; name: string }) {
  async function handle() {
    "use server";
    await removeCondition(conditionId);
  }

  return (
    <form action={handle} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1">
      <span className="text-xs font-semibold text-red-700">{name}</span>
      <button type="submit" className="text-red-400 hover:text-red-700 text-xs font-bold">
        Ã—
      </button>
    </form>
  );
}

function AddConditionForm({ studentId }: { studentId: string }) {
  async function handle(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const details = (formData.get("details") as string) || undefined;
    await addCondition(studentId, name, details);
  }

  return (
    <form action={handle} className="mt-2 flex gap-2">
      <input
        name="name"
        placeholder="Condition nameâ€¦"
        required
        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-primary"
      />
      <input
        name="details"
        placeholder="Details (optional)"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-primary"
      />
      <button
        type="submit"
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
      >
        Add
      </button>
    </form>
  );
}



