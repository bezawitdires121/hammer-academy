import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Search, Users } from "lucide-react";
import { assignLibraryRole, removeLibraryRole } from "../actions";

type Props = { searchParams: Promise<{ q?: string }> };

const LIBRARY_ROLES = ["Library Monitor", "Reading Ambassador", "Shelf Helper", "Book Club Lead"];

export default async function LibrarianStudentsPage({ searchParams }: Props) {
  await requireRole(["LIBRARIAN", "ADMIN"]);
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
          loans: {
            where: { status: "BORROWED" },
            include: { bookCopy: { include: { book: true } } },
          },
          studentLibraryRoles: true,
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
          Search students to view library activity and manage roles.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or student ID…"
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
          <p className="mt-1 text-sm text-slate-500">
            Enter a name or student ID to find a student.
          </p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-slate-500">No students found for &quot;{q}&quot;.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{student.fullName}</p>
                  <p className="font-mono text-xs text-slate-400">{student.studentLoginId}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {student.loans.length} active loan{student.loans.length !== 1 ? "s" : ""}
                </span>
              </div>

              {student.loans.length > 0 && (
                <div className="mt-3 space-y-1">
                  {student.loans.map((loan) => (
                    <p key={loan.id} className="text-sm text-slate-600">
                      · {loan.bookCopy.book.title} — due{" "}
                      {formatEthiopianDisplay(loan.dueAt)}
                    </p>
                  ))}
                </div>
              )}

              {/* Library roles */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">Library roles</p>
                <div className="flex flex-wrap gap-2">
                  {student.studentLibraryRoles.map((r) => (
                    <RemoveRoleForm key={r.id} roleId={r.id} label={r.role} />
                  ))}
                </div>
                <AssignRoleForm studentId={student.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemoveRoleForm({ roleId, label }: { roleId: string; label: string }) {
  async function handle() {
    "use server";
    await removeLibraryRole(roleId);
  }

  return (
    <form action={handle} className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1">
      <span className="text-xs font-semibold text-brand-primary">{label}</span>
      <button type="submit" className="text-brand-primary/60 hover:text-red-600 text-xs font-bold">
        ×
      </button>
    </form>
  );
}

function AssignRoleForm({ studentId }: { studentId: string }) {
  async function handle(formData: FormData) {
    "use server";
    const role = formData.get("role") as string;
    await assignLibraryRole(studentId, role);
  }

  return (
    <form action={handle} className="mt-2 flex gap-2">
      <select
        name="role"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-brand-primary"
      >
        <option value="">Assign role…</option>
        {LIBRARY_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
      <button
        type="submit"
        className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
      >
        Assign
      </button>
    </form>
  );
}



