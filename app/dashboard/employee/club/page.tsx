import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { postClubAnnouncement } from "./actions";
import {
  ArrowRight,
  Megaphone,
  Users,
  Star,
  UserPlus,
} from "lucide-react";

const roleColors: Record<string, string> = {
  MEMBER: "bg-slate-100 text-slate-600",
  ASSISTANT: "bg-blue-100 text-blue-700",
  SECRETARY: "bg-purple-100 text-purple-700",
  DEPUTY: "bg-brand-primary/10 text-brand-primary",
};

export default async function ClubLeaderPage() {
  const session = await requireTeacher();

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      clubs: {
        include: {
          memberships: {
            include: { student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } } },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });

  if (!teacher) return null;

  if (teacher.clubs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Club</h1>
          <p className="mt-1 text-sm text-slate-500">Your club management area.</p>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">No club assigned</h2>
          <p className="mt-1 text-sm text-slate-500">
            An administrator needs to assign you as a club leader.
          </p>
        </div>
      </div>
    );
  }

  // Show first club (most teachers lead one)
  const club = teacher.clubs[0];
  const members = club.memberships;
  const officers = members.filter((m) => m.role !== "MEMBER");

  // Recent announcements by this teacher
  const recentAnnouncements = await prisma.announcement.findMany({
    where: { createdById: teacher.userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl bg-brand-primary shadow-lg">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-accent/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/60">Club Leader</p>
              <h1 className="mt-1 text-2xl font-black text-white">
                {club.name}
              </h1>
              {club.clubType && (
                <p className="mt-1 text-sm text-white/70">{club.clubType}</p>
              )}
              {club.description && (
                <p className="mt-1 text-sm text-white/60">{club.description}</p>
              )}
            </div>
            <Link
              href="/dashboard/employee/club/members"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-bold text-brand-primary transition hover:brightness-105"
            >
              <Users size={16} />
              Manage Members
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Total Members</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{members.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Officers</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{officers.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Announcements</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {recentAnnouncements.length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Officers */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Club Officers</h2>
            <Link
              href="/dashboard/employee/club/members"
              className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
            >
              All members <ArrowRight size={13} />
            </Link>
          </div>
          {officers.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No officers assigned yet. Promote members from the Members page.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {officers.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                      {m.student.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {m.student.fullName}
                      </p>
                      <p className="font-mono text-xs text-slate-400">
                        {m.student.studentLoginId}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      roleColors[m.role] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Post announcement */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Post Announcement</h2>
          </div>
          <div className="p-5">
            <form action={postClubAnnouncement} className="space-y-3">
              <input type="hidden" name="clubId" value={club.id} />
              <input
                name="title"
                required
                placeholder="Announcement title"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              />
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Write your announcement…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
              >
                Post Announcement
              </button>
            </form>

            {recentAnnouncements.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recent
                </p>
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatEthiopianDisplay(a.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recent members */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">
            Members ({members.length})
          </h2>
          <Link
            href="/dashboard/employee/club/members"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            <UserPlus size={13} />
            Add / Manage
          </Link>
        </div>
        {members.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No members yet. Use the Members page to search and add students.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                    {m.student.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {m.student.fullName}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      {m.student.studentLoginId}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    roleColors[m.role] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.role}
                </span>
              </div>
            ))}
            {members.length > 8 && (
              <div className="px-5 py-3 text-center">
                <Link
                  href="/dashboard/employee/club/members"
                  className="text-sm font-semibold text-brand-primary hover:underline"
                >
                  View all {members.length} members →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}



