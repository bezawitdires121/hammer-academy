import {
  formatEthiopianDate,
  formatEthiopianDisplay,
} from "@/lib/ethiopian-calendar";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  Home,
  Lock,
  Shield,
  Users,
} from "lucide-react";
import {
  setTeacherStatus,
  assignHomeroom,
  removeHomeroom,
  assignClub,
  addSubjectAssignment,
  endSubjectAssignment,
  removeSubjectAssignment,
} from "../actions";
import ActionForm from "./ActionForm";
type Props = {
  params: Promise<{ id: string }>;
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-yellow-100 text-yellow-700",
  LOCKED: "bg-red-100 text-red-700",
};

export default async function TeacherDetailPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: true,

      subjectAssignments: {
        include: {
          subject: true,
          section: {
            include: {
              grade: true,
              schoolYear: true,
            },
          },
        },
        orderBy: {
          section: {
            schoolYear: {
              startDate: "desc",
            },
          },
        },
      },

      homeroomSections: {
        include: {
          grade: true,
          schoolYear: true,
        },
      },

      clubs: true,

      assignmentHistory: {
        include: {
          section: {
            include: {
              grade: true,
              schoolYear: true,
            },
          },
          subject: true,
          assignedBy: {
            include: {
              adminProfile: true,
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: 100,
      },

      statusHistory: {
        include: {
          changedBy: {
            include: {
              adminProfile: true,
            },
          },
        },
        orderBy: {
          effectiveAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!teacher) {
    notFound();
  }

  const [sections, subjects, clubs, currentYear] = await Promise.all([
    prisma.section.findMany({
      include: {
        grade: true,
        schoolYear: true,
      },
      orderBy: [
        {
          schoolYear: {
            startDate: "desc",
          },
        },
        {
          grade: {
            level: "asc",
          },
        },
        {
          label: "asc",
        },
      ],
    }),

    prisma.subject.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.club.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.schoolYear.findFirst({
      where: {
        isCurrent: true,
      },
    }),
  ]);

  const availableForHomeroom = sections.filter(
    (section) =>
      !section.homeroomTeacherId ||
      section.homeroomTeacherId === teacher.id
  );

  const todayEC = formatEthiopianDate(new Date());

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/admin/teachers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back to Teachers
      </Link>

      {/* Profile header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-primary/10">
              {teacher.photoUrl ? (
                <img
                  src={teacher.photoUrl}
                  alt={teacher.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-brand-primary">
                  {teacher.fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((name) => name[0]?.toUpperCase())
                    .join("")}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Teacher
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {teacher.fullName}
              </h1>

              <p className="mt-1 font-mono text-sm text-slate-500">
                Login ID:{" "}
                <span className="font-semibold text-slate-700">
                  {teacher.teacherLoginId}
                </span>
              </p>

              {teacher.user.email && (
                <p className="mt-0.5 text-sm text-slate-500">
                  {teacher.user.email}
                </p>
              )}

              {teacher.user.phone && (
                <p className="mt-0.5 text-sm text-slate-500">
                  {teacher.user.phone}
                </p>
              )}
            </div>
          </div>

          <span
            className={`self-start rounded-full px-3 py-1.5 text-sm font-bold ${
              statusColors[teacher.status] ??
              "bg-slate-100 text-slate-600"
            }`}
          >
            {teacher.status}
          </span>
        </div>
      </section>

      {/* Status control */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Shield size={18} />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Account Status
          </h2>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          <strong>Active</strong> â€” normal access.{" "}
          <strong>Inactive</strong> â€” temporary leave or vacation, no
          login. <strong>Locked</strong> â€” security restriction, no
          login.
        </p>

        <ActionForm action={setTeacherStatus}
          className="flex flex-wrap items-end gap-3"
        >
          <input
            type="hidden"
            name="teacherId"
            value={teacher.id}
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              New Status
            </label>

            <select
              name="status"
              defaultValue={teacher.status}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">
                Inactive (leave/vacation)
              </option>
              <option value="LOCKED">
                Locked (security)
              </option>
            </select>
          </div>

          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Reason (optional)
            </label>

            <input
              name="reason"
              placeholder="e.g. Maternity leave until March"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
          >
            Update Status
          </button>
        </ActionForm>

        {/* Status history */}
        {teacher.statusHistory.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Status History
            </p>

            <div className="space-y-2">
              {teacher.statusHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm"
                >
                  <div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        statusColors[history.status] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {history.status}
                    </span>

                    {history.reason && (
                      <span className="ml-2 text-slate-500">
                        {history.reason}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-400">
                    {formatEthiopianDisplay(history.effectiveAt)} Â·{" "}
                    {history.changedBy.adminProfile?.fullName ??
                      "Admin"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Subject assignments */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <BookOpen size={18} />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Subject Assignments
          </h2>
        </div>

        {teacher.subjectAssignments.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">
            No subject assignments yet.
          </p>
        ) : (
          <div className="mb-5 space-y-2">
            {teacher.subjectAssignments.map((assignment) => {
              const activeHistory = teacher.assignmentHistory.find(
                (history) =>
                  history.sectionId === assignment.sectionId &&
                  history.subjectId === assignment.subjectId &&
                  history.endedAt === null
              );

              return (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {assignment.subject.name}
                        </p>

                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                          Active
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Grade {assignment.section.grade.level}
                        {assignment.section.label} Â·{" "}
                        {assignment.section.schoolYear.label}
                      </p>

                      {activeHistory && (
                        <p className="mt-1 text-xs text-slate-400">
                          Started{" "}
                          <span className="font-medium text-slate-600">
                            {formatEthiopianDisplay(
                              activeHistory.assignedAt
                            )}
                          </span>
                        </p>
                      )}
                    </div>

                    <ActionForm action={endSubjectAssignment}>
                      <input
                        type="hidden"
                        name="assignmentId"
                        value={assignment.id}
                      />

                      <input
                        type="hidden"
                        name="teacherId"
                        value={teacher.id}
                      />

                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            End Date (E.C.)
                          </label>

                          <input
                            type="text"
                            name="endDate"
                            required
                            placeholder="2018-12-21"
                            pattern="\d{4}-\d{2}-\d{2}"
                            title="Enter the Ethiopian date as YYYY-MM-DD, for example 2018-12-21"
                            className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-primary"
                          />
                        </div>

                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          End Assignment
                        </button>
                      </div>
                    </ActionForm>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add assignment */}
        <div className="border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Add Subject Assignment
          </p>

          <ActionForm action={addSubjectAssignment}
            className="flex flex-wrap items-end gap-3"
          >
            <input
              type="hidden"
              name="teacherId"
              value={teacher.id}
            />

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Section
              </label>

              <select
                name="sectionId"
                required
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                <option value="">Select sectionâ€¦</option>

                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    Grade {section.grade.level}
                    {section.label} â€” {section.schoolYear.label}
                    {currentYear?.id === section.schoolYearId
                      ? " (current)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Subject
              </label>

              <select
                name="subjectId"
                required
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                <option value="">Select subjectâ€¦</option>

                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Start Date (E.C.)
              </label>

              <input
                type="text"
                name="startDate"
                required
                defaultValue={todayEC}
                placeholder="2018-12-21"
                pattern="\d{4}-\d{2}-\d{2}"
                title="Enter the Ethiopian date as YYYY-MM-DD, for example 2018-12-21"
                className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Ethiopian Calendar
              </p>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              Assign
            </button>
          </ActionForm>
        </div>
      </section>

      {/* Assignment history */}
      {teacher.assignmentHistory.length > 0 && (
        <section className="border-t border-slate-200 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Assignment History
            </h3>

            <span className="text-xs text-slate-400">
              {teacher.assignmentHistory.length} record
              {teacher.assignmentHistory.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-2">
            {teacher.assignmentHistory.map((history) => (
              <div
                key={history.id}
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {history.subject.name}
                      </p>

                      {history.endedAt ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                          Ended
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Grade {history.section.grade.level}
                      {history.section.label} Â·{" "}
                      {history.section.schoolYear.label}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500">
                      Started{" "}
                      <span className="font-semibold text-slate-700">
                        {formatEthiopianDisplay(history.assignedAt)}
                      </span>
                    </p>

                    {history.assignedBy?.adminProfile?.fullName && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        By{" "}
                        {history.assignedBy.adminProfile.fullName}
                      </p>
                    )}
                  </div>
                </div>

                {history.endReason && (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">
                      Reason:{" "}
                      <span className="font-medium text-slate-700">
                        {history.endReason}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Homeroom assignment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Home size={18} />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Homeroom Assignment
          </h2>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          A teacher can be homeroom teacher for one or more sections.
          Homeroom gives access to the Homeroom dashboard, attendance,
          and section announcements.
        </p>

        {teacher.homeroomSections.length > 0 && (
          <div className="mb-5 space-y-2">
            {teacher.homeroomSections.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    Grade {section.grade.level}
                    {section.label}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {section.schoolYear.label}
                  </p>
                </div>

                <ActionForm action={removeHomeroom}>
                  <input
                    type="hidden"
                    name="sectionId"
                    value={section.id}
                  />

                  <input
                    type="hidden"
                    name="teacherId"
                    value={teacher.id}
                  />

                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </ActionForm>
              </div>
            ))}
          </div>
        )}

        <ActionForm action={assignHomeroom}
          className="flex flex-wrap items-end gap-3"
        >
          <input
            type="hidden"
            name="teacherId"
            value={teacher.id}
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Assign as Homeroom Teacher for
            </label>

            <select
              name="sectionId"
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
            >
              <option value="">Select sectionâ€¦</option>

              {availableForHomeroom.map((section) => (
                <option key={section.id} value={section.id}>
                  Grade {section.grade.level}
                  {section.label} â€” {section.schoolYear.label}
                  {currentYear?.id === section.schoolYearId
                    ? " (current)"
                    : ""}
                  {section.homeroomTeacherId === teacher.id
                    ? " âœ“ current"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
          >
            Assign Homeroom
          </button>
        </ActionForm>
      </section>

      {/* Club assignment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Users size={18} />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Club Assignment
          </h2>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Assigning a teacher as Club Leader gives them access to the
          Club dashboard for that club. A teacher can lead one club at a
          time.
        </p>

        {teacher.clubs.length > 0 && (
          <div className="mb-5 space-y-2">
            {teacher.clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {club.name}
                  </p>

                  {club.clubType && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {club.clubType}
                    </p>
                  )}
                </div>

                <ActionForm action={assignClub}>
                  <input
                    type="hidden"
                    name="teacherId"
                    value={teacher.id}
                  />

                  <input
                    type="hidden"
                    name="clubId"
                    value=""
                  />

                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </ActionForm>
              </div>
            ))}
          </div>
        )}

        {clubs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No clubs exist yet. Create clubs in the Clubs section
            first.
          </p>
        ) : (
          <ActionForm action={assignClub}
            className="flex flex-wrap items-end gap-3"
          >
            <input
              type="hidden"
              name="teacherId"
              value={teacher.id}
            />

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Assign as Club Leader for
              </label>

              <select
                name="clubId"
                required
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                <option value="">Select clubâ€¦</option>

                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                    {club.clubType
                      ? ` (${club.clubType})`
                      : ""}
                    {club.leaderId &&
                    club.leaderId !== teacher.id
                      ? " â€” has leader"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              Assign Club
            </button>
          </ActionForm>
        )}
      </section>

      {/* Teaching summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <CalendarCheck size={18} />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Teaching Summary
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Subjects
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {teacher.subjectAssignments.length}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Homeroom Sections
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {teacher.homeroomSections.length}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Clubs Led
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {teacher.clubs.length}
            </p>
          </div>
        </div>
      </section>

      {/* Security note */}
      {teacher.status === "LOCKED" && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-red-600" />

            <p className="text-sm font-semibold text-red-800">
              This account is locked. The teacher cannot log in until
              an admin sets the status back to Active.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}






