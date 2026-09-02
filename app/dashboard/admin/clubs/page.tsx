import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createClub, deleteClub } from "./actions";
import { Users } from "lucide-react";

export default async function AdminClubsPage() {
  await requireAdmin();

  const clubs = await prisma.club.findMany({
    include: {
      leader: true,
      _count: { select: { memberships: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clubs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage school clubs. Assign leaders from the Teachers page.
        </p>
      </div>

      {/* Create form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-900">Create Club</h2>
        <form action={createClub} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Club Name *
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Science Club"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Type (optional)
            </label>
            <input
              name="clubType"
              placeholder="e.g. Academic, Sports, Arts"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Description (optional)
            </label>
            <input
              name="description"
              placeholder="Brief description"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
          >
            Create Club
          </button>
        </form>
      </section>

      {/* Club list */}
      {clubs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">No clubs yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a club above, then assign a teacher as leader from the
            Teachers page.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 font-bold text-brand-primary">
                    {club.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {club.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                      {club.clubType && <span>{club.clubType}</span>}
                      {club.description && (
                        <span className="truncate">{club.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {club._count.memberships} members
                    </p>
                    <p className="text-xs text-slate-400">
                      {club.leader
                        ? `Leader: ${club.leader.fullName}`
                        : "No leader assigned"}
                    </p>
                  </div>
                  {club._count.memberships === 0 && (
                    <form action={deleteClub}>
                      <input type="hidden" name="clubId" value={club.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
