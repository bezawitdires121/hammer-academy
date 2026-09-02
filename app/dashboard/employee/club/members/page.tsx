import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addClubMember, removeClubMember, setMemberRole } from "../actions";
import { ArrowLeft, Search, Users } from "lucide-react";

type Props = { searchParams: Promise<{ q?: string }> };

const CLUB_ROLES = ["MEMBER", "ASSISTANT", "SECRETARY", "DEPUTY"] as const;

const roleColors: Record<string, string> = {
  MEMBER: "bg-slate-100 text-slate-600",
  ASSISTANT: "bg-blue-100 text-blue-700",
  SECRETARY: "bg-purple-100 text-purple-700",
  DEPUTY: "bg-brand-primary/10 text-brand-primary",
};

export default async function ClubMembersPage({ searchParams }: Props) {
  const session = await requireTeacher();
  const { q = "" } = await searchParams;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      clubs: {
        include: {
          memberships: {
            include: { student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } } },
            orderBy: [{ role: "asc" }, { student: { fullName: "asc" } }],
          },
        },
      },
    },
  });

  if (!teacher || teacher.clubs.length === 0) notFound();

  const club = teacher.clubs[0];
  const memberIds = new Set(club.memberships.map((m) => m.studentId));

  // Search students to add
  const searchResults = q
    ? await prisma.student.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { studentLoginId: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          enrollments: {
            include: { section: { include: { grade: true } } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 20,
        orderBy: { fullName: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/employee/club"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back to Club Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {club.name} — Members
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {club.memberships.length} member
          {club.memberships.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Search & add */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Add Member</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search for a student by name or ID.
            </p>
          </div>
          <div className="p-5">
            <form method="GET" className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search student name or ID…"
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

            {q && searchResults.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No students found for &quot;{q}&quot;.
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((student) => {
                  const alreadyMember = memberIds.has(student.id);
                  const enrollment = student.enrollments[0];
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.fullName}
                        </p>
                        <p className="font-mono text-xs text-slate-400">
                          {student.studentLoginId}
                          {enrollment && (
                            <span className="ml-2 text-slate-400">
                              · Grade {enrollment.section.grade.level}
                              {enrollment.section.label}
                            </span>
                          )}
                        </p>
                      </div>
                      {alreadyMember ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                          Member
                        </span>
                      ) : (
                        <form action={addClubMember}>
                          <input type="hidden" name="clubId" value={club.id} />
                          <input
                            type="hidden"
                            name="studentId"
                            value={student.id}
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary-hover"
                          >
                            Add
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Current members */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Current Members</h2>
          </div>
          {club.memberships.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No members yet. Search and add students on the left.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {club.memberships.map((m) => (
                <div key={m.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                        {m.student.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {m.student.fullName}
                        </p>
                        <p className="font-mono text-xs text-slate-400">
                          {m.student.studentLoginId}
                        </p>
                      </div>
                    </div>
                    <form action={removeClubMember}>
                      <input type="hidden" name="clubId" value={club.id} />
                      <input
                        type="hidden"
                        name="studentId"
                        value={m.studentId}
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </form>
                  </div>

                  {/* Role selector */}
                  <form action={setMemberRole} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="clubId" value={club.id} />
                    <input
                      type="hidden"
                      name="studentId"
                      value={m.studentId}
                    />
                    <select
                      name="role"
                      defaultValue={m.role}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-primary"
                    >
                      {CLUB_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Set Role
                    </button>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        roleColors[m.role] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.role}
                    </span>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


