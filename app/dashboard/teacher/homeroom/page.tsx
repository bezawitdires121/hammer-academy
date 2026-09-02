import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  CalendarCheck,
  Home,
  Megaphone,
  Users,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

export default async function HomeroomPage() {
  const session = await requireTeacher();

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
    include: {
      homeroomSections: {
        include: {
          grade: true,
          schoolYear: true,
          enrollments: {
            where: {
              status: "ACTIVE",
            },
          },
          announcements: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          schoolYear: {
            startDate: "desc",
          },
        },
      },
    },
  });

  if (!teacher) return null;

  if (teacher.homeroomSections.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Homeroom
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Your homeroom section management area.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <Home className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-semibold text-slate-900">
            No homeroom assigned
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            An administrator needs to assign you as a homeroom
            teacher for a section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Homeroom
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your homeroom sections — roster, attendance,
          and announcements.
        </p>
      </div>

      {/* Section cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {teacher.homeroomSections.map((section) => {
          const studentCount = section.enrollments.length;
          const lastAnnouncement = section.announcements[0];

          return (
            <div
              key={section.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Section header */}
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                    <GraduationCap size={20} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Grade {section.grade.level}
                      {section.label}
                    </h2>

                    <p className="text-xs text-slate-500">
                      {section.schoolYear.label}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                  {studentCount} students
                </span>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-400">
                    Students
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {studentCount}
                  </p>
                </div>

                <div className="p-4 text-center">
                  <p className="text-xs text-slate-400">
                    Section
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {section.label}
                  </p>
                </div>

                <div className="p-4 text-center">
                  <p className="text-xs text-slate-400">
                    Grade
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {section.grade.level}
                  </p>
                </div>
              </div>

              {/* Last announcement */}
              {lastAnnouncement && (
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-xs font-semibold text-slate-400">
                    Last announcement
                  </p>

                  <p className="mt-0.5 truncate text-sm text-slate-700">
                    {lastAnnouncement.title}
                  </p>

                  <p className="text-xs text-slate-400">
                    {formatEthiopianDisplay(new Date(lastAnnouncement.createdAt))}
                  </p>
                </div>
              )}

              {/* Navigation links */}
              <div className="grid grid-cols-3 gap-2 p-4">
                {/* Roster */}
                <Link
                  href={`/dashboard/teacher/homeroom/${section.id}/roster`}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
                >
                  <Users
                    size={18}
                    className="text-brand-primary"
                  />

                  <span className="text-xs font-semibold text-slate-700">
                    Roster
                  </span>
                </Link>

                {/* Attendance */}
                {/* Attendance */}
                <Link
                  href={`/dashboard/teacher/homeroom/${section.id}/attendance`}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
                >
                  <CalendarCheck
                    size={18}
                    className="text-brand-primary"
                  />

                  <span className="text-xs font-semibold text-slate-700">
                    Attendance
                  </span>
                </Link>

                {/* Announcements */}
                <Link
                  href={`/dashboard/teacher/homeroom/${section.id}?tab=announcements`}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
                >
                  <Megaphone
                    size={18}
                    className="text-brand-primary"
                  />

                  <span className="text-xs font-semibold text-slate-700">
                    Announce
                  </span>
                </Link>
              </div>

              {/* Open Section */}
              <div className="border-t border-slate-100 px-4 pb-4">
                <Link
                  href={`/dashboard/teacher/homeroom/${section.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
                >
                  Open Section
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}






