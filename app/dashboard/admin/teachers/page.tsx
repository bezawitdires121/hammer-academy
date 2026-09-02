import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import Link from "next/link";
import { Search, UserCheck, UserPlus, Users } from "lucide-react";

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-yellow-100 text-yellow-700",
  LOCKED: "bg-red-100 text-red-700",
};

export default async function TeachersPage({ searchParams }: Props) {
  await requireAdmin();

  const { q = "", status = "" } = await searchParams;

  const teachers = await prisma.teacher.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { teacherLoginId: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      user: true,
      subjectAssignments: {
        include: {
          section: { include: { grade: true, schoolYear: true } },
          subject: true,
        },
      },
      homeroomSections: { include: { grade: true } },
      clubs: true,
    },
    orderBy: { fullName: "asc" },
  });

  const total = await prisma.teacher.count();
  const active = await prisma.teacher.count({ where: { status: "ACTIVE" } });
  const inactive = await prisma.teacher.count({ where: { status: "INACTIVE" } });
  const locked = await prisma.teacher.count({ where: { status: "LOCKED" } });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teachers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage teacher accounts, assignments, and status.
          </p>
        </div>
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-hover"
        >
          <UserPlus size={16} />
          Add Teacher
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: total, color: "text-slate-900" },
          { label: "Active", value: active, color: "text-green-600" },
          { label: "Inactive", value: inactive, color: "text-yellow-600" },
          { label: "Locked", value: locked, color: "text-red-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
            </div>
            <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <form method="GET" className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or login ID..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="LOCKED">Locked</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Search
        </button>
        {(q || status) && (
          <Link
            href="/dashboard/admin/teachers"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset
          </Link>
        )}
      </form>

      {/* List */}
      {teachers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <UserCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">No teachers found</h2>
          <p className="mt-1 text-sm text-slate-500">
            {q || status ? "Try adjusting your search." : "No teachers have been added yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {teachers.map((teacher) => {
              const sectionLabels = [
                ...new Set(
                  teacher.subjectAssignments.map(
                    (a) =>
                      `Grade ${a.section.grade.level}${a.section.label} (${a.section.schoolYear.label})`
                  )
                ),
              ];
              return (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-primary/10">
                      {teacher.photoUrl ? (
                        <img
                          src={teacher.photoUrl}
                          alt={teacher.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-bold text-brand-primary">
                          {teacher.fullName
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((name) => name[0]?.toUpperCase())
                            .join("")}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {teacher.fullName}
                      </p>
                      <p className="font-mono text-xs text-slate-400">
                        {teacher.teacherLoginId}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {teacher.homeroomSections.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-[10px] font-semibold text-brand-primary"
                          >
                            Homeroom: Grade {s.grade.level}
                            {s.label}
                          </span>
                        ))}
                        {teacher.clubs.map((c) => (
                          <span
                            key={c.id}
                            className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700"
                          >
                            Club: {c.name}
                          </span>
                        ))}
                        {sectionLabels.slice(0, 2).map((l) => (
                          <span
                            key={l}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                          >
                            {l}
                          </span>
                        ))}
                        {sectionLabels.length > 2 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            +{sectionLabels.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        statusColors[teacher.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {teacher.status}
                    </span>
                    <Link
                      href={`/dashboard/admin/teachers/${teacher.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-primary hover:text-brand-primary"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

