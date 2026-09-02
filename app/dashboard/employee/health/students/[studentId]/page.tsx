import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  HeartPulse,
  Phone,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Activity,
  Clock3,
  ExternalLink,
} from "lucide-react";
import { addCondition, removeCondition } from "../../actions";

type Props = {
  params: Promise<{
    studentId: string;
  }>;
};

const outcomeStyles: Record<string, string> = {
  RECOVERED: "bg-green-50 text-green-700 ring-green-600/20",
  REFERRED: "bg-red-50 text-red-700 ring-red-600/20",
  UNDER_OBSERVATION: "bg-blue-50 text-blue-700 ring-blue-600/20",
  OTHER: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function outcomeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function HealthStudentPage({ params }: Props) {
  await requireRole(["HEALTH", "ADMIN"]);

  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
    include: {
      healthConditions: {
        orderBy: {
          createdAt: "desc",
        },
      },
      healthVisits: {
        orderBy: {
          visitDate: "desc",
        },
        take: 50,
      },
      parentContacts: {
        take: 3,
      },
      enrollments: {
        include: {
          section: {
            include: {
              grade: true,
              schoolYear: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!student) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <UserRound size={22} />
          </div>

          <h1 className="mt-4 font-bold text-slate-900">
            Student not found
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            The requested student health record could not be found.
          </p>

          <Link
            href="/dashboard/employee/health/students"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16} />
            Back to Health Students
          </Link>
        </div>
      </div>
    );
  }

  const enrollment = student.enrollments[0];
  const guardian = student.parentContacts[0];

  const now = new Date();

  const upcomingFollowUps = student.healthVisits.filter(
    (visit) =>
      visit.followUpAt &&
      visit.followUpAt >= now
  );

  const lastVisit = student.healthVisits[0];

  const referredVisits = student.healthVisits.filter(
    (visit) => visit.outcome === "REFERRED"
  ).length;

  const observationVisits = student.healthVisits.filter(
    (visit) => visit.outcome === "UNDER_OBSERVATION"
  ).length;

  return (
    <div className="space-y-6">

      {/* BACK NAVIGATION */}
      <Link
        href="/dashboard/employee/health/students"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-primary"
      >
        <ArrowLeft size={16} />
        Health Students
      </Link>

      {/* STUDENT HEADER */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="bg-brand-primary px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <HeartPulse size={30} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/80">
                    Student Health Record
                  </span>

                  {student.healthConditions.length > 0 && (
                    <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-100">
                      Health Attention
                    </span>
                  )}
                </div>

                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                  {student.fullName}
                </h1>

                <p className="mt-1 font-mono text-sm text-white/60">
                  {student.studentLoginId}
                </p>
              </div>
            </div>

            <Link
              href={`/dashboard/employee/health/visits?record=1&studentId=${student.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-primary shadow-sm transition hover:bg-slate-50"
            >
              <ClipboardPlus size={17} />
              Record Health Visit
            </Link>
          </div>
        </div>

        {/* STUDENT INFORMATION */}
        <div className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">

          <InfoBlock
            icon={UserRound}
            label="Student"
            value={student.fullName}
          />

          <InfoBlock
            icon={Activity}
            label="Grade & Section"
            value={
              enrollment
                ? `Grade ${enrollment.section.grade.level} â€” ${enrollment.section.label}`
                : "Not assigned"
            }
          />

          <InfoBlock
            icon={CalendarDays}
            label="School Year"
            value={
              enrollment?.section.schoolYear?.label ??
              "Not available"
            }
          />

          <InfoBlock
            icon={Stethoscope}
            label="Last Visit"
            value={
              lastVisit
                ? formatEthiopianDisplay(lastVisit.visitDate)
                : "No visits"
            }
          />

        </div>
      </section>

      {/* HEALTH SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <SummaryCard
          label="Health Conditions"
          value={student.healthConditions.length}
          description={
            student.healthConditions.length === 0
              ? "No conditions recorded"
              : "Conditions on record"
          }
          icon={ShieldAlert}
          tone="red"
        />

        <SummaryCard
          label="Total Visits"
          value={student.healthVisits.length}
          description="Recorded health visits"
          icon={HeartPulse}
          tone="blue"
        />

        <SummaryCard
          label="Follow-ups"
          value={upcomingFollowUps.length}
          description={
            upcomingFollowUps.length
              ? "Upcoming follow-ups"
              : "Nothing scheduled"
          }
          icon={Clock3}
          tone="amber"
        />

        <SummaryCard
          label="Referrals"
          value={referredVisits}
          description={
            referredVisits
              ? "Visits requiring referral"
              : "No referrals recorded"
          }
          icon={ExternalLink}
          tone="green"
        />

      </div>

      {/* FOLLOW-UP ALERT */}
      {upcomingFollowUps.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <CalendarDays size={20} />
            </div>

            <div className="flex-1">

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold text-amber-900">
                  Follow-up attention required
                </h2>

                <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                  {upcomingFollowUps.length} scheduled
                </span>
              </div>

              <p className="mt-1 text-sm text-amber-800">
                This student has upcoming health follow-up records that
                should be reviewed.
              </p>

              <div className="mt-4 space-y-2">

                {upcomingFollowUps.slice(0, 3).map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-white/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {visit.reason ?? "Health follow-up"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Follow-up date
                      </p>
                    </div>

                    <span className="text-sm font-bold text-amber-700">
                      {visit.followUpAt ? formatEthiopianDisplay(visit.followUpAt) : ""}
                    </span>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </section>
      )}

      {/* MAIN CONTENT */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* LEFT / MAIN */}
        <div className="space-y-6 lg:col-span-2">

          {/* CONDITIONS */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ShieldAlert size={19} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Health Conditions
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Important health conditions recorded for this student.
                  </p>
                </div>

              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {student.healthConditions.length}
              </span>

            </div>

            <div className="p-6">

              {student.healthConditions.length === 0 ? (

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">

                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
                    <HeartPulse size={20} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No health conditions recorded
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Add a condition only when it is relevant to the
                    student's school health record.
                  </p>

                </div>

              ) : (

                <div className="space-y-3">

                  {student.healthConditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-red-100 bg-red-50/60 p-4"
                    >
                      <div className="flex gap-3">

                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                          <ShieldAlert size={16} />
                        </div>

                        <div>
                          <p className="font-semibold text-red-900">
                            {condition.name}
                          </p>

                          {condition.details && (
                            <p className="mt-1 text-sm leading-5 text-red-700">
                              {condition.details}
                            </p>
                          )}

                          <p className="mt-2 text-[11px] text-red-500">
                            Added{" "}
                            {formatEthiopianDisplay(condition.createdAt)}
                          </p>
                        </div>

                      </div>

                      <RemoveConditionForm
                        conditionId={condition.id}
                      />

                    </div>
                  ))}

                </div>

              )}

              <AddConditionForm studentId={student.id} />

            </div>
          </section>

          {/* VISIT HISTORY */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Stethoscope size={19} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Health Visit History
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Previous visits and health office observations.
                  </p>
                </div>

              </div>

              <Link
                href={`/dashboard/employee/health/visits?studentId=${student.id}`}
                className="hidden items-center gap-1 text-xs font-bold text-brand-primary sm:flex"
              >
                View all
                <ExternalLink size={13} />
              </Link>

            </div>

            <div className="divide-y divide-slate-100">

              {student.healthVisits.length === 0 ? (

                <div className="px-6 py-12 text-center">

                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                    <Activity size={20} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No health visits yet
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    A visit record will appear here after the first
                    health office visit.
                  </p>

                </div>

              ) : (

                student.healthVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="p-6 transition hover:bg-slate-50/60"
                  >

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      <div className="flex gap-3">

                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Stethoscope size={17} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {visit.reason ?? "Health office visit"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatEthiopianDisplay(visit.visitDate)}
                          </p>
                        </div>

                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                          outcomeStyles[visit.outcome] ??
                          outcomeStyles.OTHER
                        }`}
                      >
                        {outcomeLabel(visit.outcome)}
                      </span>

                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">

                      {visit.symptoms && (
                        <VisitDetail
                          label="Symptoms"
                          value={visit.symptoms}
                        />
                      )}

                      {visit.treatment && (
                        <VisitDetail
                          label="Treatment"
                          value={visit.treatment}
                        />
                      )}

                      {visit.medication && (
                        <VisitDetail
                          label="Medication"
                          value={visit.medication}
                        />
                      )}

                      {visit.referral && (
                        <VisitDetail
                          label="Referral"
                          value={visit.referral}
                        />
                      )}

                    </div>

                    {visit.notes && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">

                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Health Office Notes
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {visit.notes}
                        </p>

                      </div>
                    )}

                    {visit.followUpAt && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        <CalendarDays size={14} />
                        Follow-up scheduled for{" "}
                        {formatEthiopianDisplay(visit.followUpAt)}
                      </div>
                    )}

                  </div>
                ))

              )}

            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">

          {/* GUARDIAN */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <UserRound size={17} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Guardian Contact
                  </h2>

                  <p className="text-xs text-slate-500">
                    Emergency / family contact
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">

              {guardian ? (

                <div className="space-y-4">

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Name
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {guardian.fullName}
                    </p>
                  </div>

                  {guardian.phone && (
                    <div className="rounded-xl bg-slate-50 p-3">

                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone size={15} />

                        <span className="text-xs font-semibold">
                          Phone
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {guardian.phone}
                      </p>

                    </div>
                  )}

                </div>

              ) : (

                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    No guardian contact
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    No guardian contact is currently recorded.
                  </p>
                </div>

              )}

            </div>
          </section>

          {/* HEALTH STATUS */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Health Status
              </h2>
            </div>

            <div className="space-y-3 p-5">

              <StatusRow
                label="Recorded conditions"
                value={
                  student.healthConditions.length > 0
                    ? `${student.healthConditions.length} on record`
                    : "None recorded"
                }
                warning={student.healthConditions.length > 0}
              />

              <StatusRow
                label="Upcoming follow-ups"
                value={
                  upcomingFollowUps.length > 0
                    ? `${upcomingFollowUps.length} scheduled`
                    : "None scheduled"
                }
                warning={upcomingFollowUps.length > 0}
              />

              <StatusRow
                label="Observation cases"
                value={`${observationVisits}`}
                warning={observationVisits > 0}
              />

              <StatusRow
                label="Referrals"
                value={`${referredVisits}`}
                warning={referredVisits > 0}
              />

            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Health Office Actions
              </h2>
            </div>

            <div className="space-y-2 p-4">

              <Link
                href={`/dashboard/employee/health/visits?record=1&studentId=${student.id}`}
                className="flex items-center gap-3 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                <ClipboardPlus size={17} />
                Record Health Visit
              </Link>

              <Link
                href={`/dashboard/employee/health/visits?studentId=${student.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <CalendarDays size={17} />
                View Visit History
              </Link>

              <Link
                href="/dashboard/employee/health/students"
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={17} />
                Back to Students
              </Link>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: "red" | "blue" | "amber" | "green";
}) {
  const styles = {
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}
        >
          <Icon size={19} />
        </div>

      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">

      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`text-xs font-bold ${
          warning
            ? "text-amber-700"
            : "text-green-700"
        }`}
      >
        {value}
      </span>

    </div>
  );
}

function VisitDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function RemoveConditionForm({
  conditionId,
}: {
  conditionId: string;
}) {
  async function handle() {
    "use server";
    await removeCondition(conditionId);
  }

  return (
    <form action={handle}>
      <button
        type="submit"
        className="shrink-0 text-xs font-semibold text-red-500 transition hover:text-red-700"
      >
        Remove
      </button>
    </form>
  );
}

function AddConditionForm({
  studentId,
}: {
  studentId: string;
}) {
  async function handle(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;

    const details =
      (formData.get("details") as string) || undefined;

    await addCondition(studentId, name, details);
  }

  return (
    <form
      action={handle}
      className="mt-5 border-t border-slate-100 pt-5"
    >
      <p className="mb-3 text-sm font-semibold text-slate-700">
        Add Health Condition
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">

        <input
          name="name"
          required
          placeholder="Condition name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
        />

        <input
          name="details"
          placeholder="Details (optional)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
        />

        <button
          type="submit"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Add Condition
        </button>

      </div>
    </form>
  );
}




