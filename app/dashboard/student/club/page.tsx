import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

const roleColors: Record<string, string> = {
  MEMBER: "bg-slate-100 text-slate-600",
  ASSISTANT: "bg-blue-100 text-blue-700",
  SECRETARY: "bg-purple-100 text-purple-700",
  DEPUTY: "bg-brand-primary/10 text-brand-primary",
};

export default async function StudentClubPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      clubMemberships: {
        include: {
          club: {
            include: {
              leader: { select: { fullName: true } },
              memberships: { select: { id: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!student) redirect("/dashboard/student");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Club</h1>
        <p className="mt-1 text-sm text-slate-500">Your club memberships and roles.</p>
      </div>

      {student.clubMemberships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">Not in a club</h2>
          <p className="mt-1 text-sm text-slate-500">
            You have not been added to any club yet. Contact your club leader or administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {student.clubMemberships.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{m.club.name}</h2>
                  {m.club.clubType && (
                    <p className="mt-0.5 text-sm text-slate-500">{m.club.clubType}</p>
                  )}
                  {m.club.description && (
                    <p className="mt-1 text-sm text-slate-600">{m.club.description}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${roleColors[m.role] ?? "bg-slate-100 text-slate-600"}`}>
                  {m.role}
                </span>
              </div>
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Members</p>
                  <p className="mt-1 font-semibold text-slate-900">{m.club.memberships.length}</p>
                </div>
                {m.club.leader && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Club Leader</p>
                    <p className="mt-1 font-semibold text-slate-900">{m.club.leader.fullName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Joined</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {new Date(m.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
