import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { teacherIsHomeroomTeacher } from "@/lib/teacher-access";
import { notFound } from "next/navigation";
import Link from "next/link";
import AnnouncementForm from "./AnnouncementForm";
import {
  ArrowLeft,
  CalendarCheck,
  Megaphone,
  Users,
} from "lucide-react";

type Props = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ tab?: string; semesterId?: string }>;
};

export default async function HomeroomSectionPage({
  params,
  searchParams,
}: Props) {
  const session = await requireTeacher();

  const { sectionId } = await params;
  const { tab, semesterId } = await searchParams;

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!teacher || teacher.status !== "ACTIVE") {
    notFound();
  }

  /*
   * This page is HOMEROOM ONLY.
   *
   * A subject teacher must not be able to open this page
   * simply because they teach a subject in the section.
   */
  const isHomeroom = await teacherIsHomeroomTeacher(
    teacher.id,
    sectionId
  );

  if (!isHomeroom) {
    notFound();
  }

  const section = await prisma.section.findUnique({
    where: {
      id: sectionId,
    },
    include: {
      grade: true,
      schoolYear: true,

      enrollments: {
        where: {
          status: "ACTIVE",
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              photoUrl: true,
              studentLoginId: true,
            },
          },
        },
        orderBy: {
          student: {
            fullName: "asc",
          },
        },
      },

      announcements: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  if (!section) {
    notFound();
  }

  const selectedSemester = semesterId
    ? await prisma.semester.findFirst({
        where: {
          id: semesterId,
          schoolYearId: section.schoolYearId,
        },
        select: {
          id: true,
          isLocked: true,
        },
      })
    : await prisma.semester.findFirst({
        where: {
          schoolYearId: section.schoolYearId,
          isCurrent: true,
        },
        select: {
          id: true,
          isLocked: true,
        },
      });

  const selectedSemesterId = selectedSemester?.id ?? null;

  const isSelectedSemesterLocked =
    selectedSemester?.isLocked ?? true;

  const isAnnouncementsTab = tab === "announcements";

  if (isAnnouncementsTab) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/teacher/homeroom/${section.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Announcements
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Grade {section.grade.level}
              {section.label} · {section.schoolYear.label}
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <Megaphone size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  New Announcement
                </h2>

                <p className="text-sm text-slate-500">
                  Send an announcement to this homeroom section.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <AnnouncementForm
              sectionId={section.id}
              sectionName={`Grade ${section.grade.level}${section.label}`}
              semesterId={selectedSemesterId}
              isLocked={isSelectedSemesterLocked}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Section Announcements
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Announcements for Grade {section.grade.level}
                {section.label}
              </p>
            </div>

            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              {section.announcements.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {section.announcements.length === 0 ? (
              <div className="p-12 text-center">
                <Megaphone className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-3 font-semibold text-slate-700">
                  No announcements yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  There are currently no announcements for this section.
                </p>
              </div>
            ) : (
              section.announcements.map((announcement) => (
                <article key={announcement.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {announcement.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatEthiopianDisplay(
                          new Date(announcement.createdAt)
                        )}
                      </p>
                    </div>

                    {announcement.priority && (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                        Priority
                      </span>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {announcement.body}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/teacher/homeroom"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Grade {section.grade.level}
            {section.label}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {section.schoolYear.label} · Homeroom Section
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-400">
              Homeroom Section
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Grade {section.grade.level}
              {section.label}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {section.schoolYear.label}
            </p>
          </div>

          <div className="rounded-xl bg-green-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-green-700">
              Active Students
            </p>

            <p className="mt-1 text-2xl font-bold text-green-800">
              {section.enrollments.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={`/dashboard/teacher/homeroom/${section.id}/roster`}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Users size={22} />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Student Roster
          </h3>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            View academic results, calculate averages and ranks,
            generate the official two-page roster, and print it.
          </p>

          <div className="mt-5 flex items-center text-sm font-semibold text-brand-primary">
            Open Roster
            <span className="ml-2 transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>

        <Link
          href={`/dashboard/teacher/homeroom/${section.id}/attendance`}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <CalendarCheck size={22} />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Attendance
          </h3>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            Select a date, manage attendance and generate a
            printable one-page attendance sheet.
          </p>

          <div className="mt-5 flex items-center text-sm font-semibold text-green-700">
            Open Attendance
            <span className="ml-2 transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>

        <Link
          href={`/dashboard/teacher/homeroom/${section.id}?tab=announcements`}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <Megaphone size={22} />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Announcements
          </h3>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            Create and manage announcements specifically for
            this homeroom section.
          </p>

          <div className="mt-5 flex items-center text-sm font-semibold text-red-700">
            Open Announcements
            <span className="ml-2 transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">
            Homeroom Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Quick information about your assigned section.
          </p>
        </div>

        <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-400">
              Students
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {section.enrollments.length}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-400">
              Section
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {section.label}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-400">
              School Year
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {section.schoolYear.label}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}



