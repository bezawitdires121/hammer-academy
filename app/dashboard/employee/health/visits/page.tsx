import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Activity } from "lucide-react";
import { recordVisit } from "../actions";

const outcomeColors: Record<string, string> = {
  RECOVERED: "bg-green-100 text-green-700",
  REFERRED: "bg-yellow-100 text-yellow-700",
  UNDER_OBSERVATION: "bg-blue-100 text-blue-700",
  OTHER: "bg-slate-100 text-slate-600",
};

const OUTCOMES = ["RECOVERED", "REFERRED", "UNDER_OBSERVATION", "OTHER"];

type Props = {
  searchParams: Promise<{ studentId?: string; record?: string }>;
};

export default async function HealthVisitsPage({ searchParams }: Props) {
  await requireRole(["HEALTH", "ADMIN"]);
  const { studentId = "", record } = await searchParams;

  const [visits, student, students] = await Promise.all([
    prisma.healthVisit.findMany({
      where: studentId ? { studentId } : undefined,
      include: { student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } } },
      orderBy: { visitDate: "desc" },
      take: 100,
    }),
    studentId ? prisma.student.findUnique({ where: { id: studentId } }) : null,
    record === "1"
      ? prisma.student.findMany({
          orderBy: { fullName: "asc" },
          take: 300,
          select: { id: true, fullName: true, photoUrl: true, studentLoginId: true },
        })
      : [],
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {student ? `Visits â€” ${student.fullName}` : "All Visits"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {visits.length} visit record{visits.length !== 1 ? "s" : ""}
            {student && (
              <>
                {" "}Â·{" "}
                <a href="/dashboard/employee/health/visits" className="text-brand-primary underline">
                  View all
                </a>
              </>
            )}
          </p>
        </div>
        <a
          href="?record=1"
          className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Record Visit
        </a>
      </div>

      {record === "1" && (
        <form
          action={async (fd) => { "use server"; await recordVisit(fd); }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 font-bold text-slate-900">Record a visit</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Student *</label>
              <select
                name="studentId"
                required
                defaultValue={studentId}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                <option value="">Select studentâ€¦</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentLoginId})
                  </option>
                ))}
              </select>
            </div>
            <Field name="reason" label="Reason for visit" />
            <Field name="symptoms" label="Symptoms" />
            <Field name="treatment" label="Treatment given" />
            <Field name="medication" label="Medication" />
            <Field name="referral" label="Referral (if any)" />
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Outcome *</label>
              <select
                name="outcome"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Follow-up date</label>
              <input
                name="followUpAt"
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Save visit
            </button>
            <a
              href="/dashboard/employee/health/visits"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </a>
          </div>
        </form>
      )}

      {visits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <Activity className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">No visits recorded</h2>
          <p className="mt-1 text-sm text-slate-500">
            {student ? "No visits for this student yet." : "No visits recorded yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <div key={visit.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{visit.student.fullName}</p>
                    <span className="font-mono text-xs text-slate-400">
                      {visit.student.studentLoginId}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatEthiopianDisplay(visit.visitDate)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    outcomeColors[visit.outcome] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {visit.outcome.replace("_", " ")}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {visit.reason && <Detail label="Reason" value={visit.reason} />}
                {visit.symptoms && <Detail label="Symptoms" value={visit.symptoms} />}
                {visit.treatment && <Detail label="Treatment" value={visit.treatment} />}
                {visit.medication && <Detail label="Medication" value={visit.medication} />}
                {visit.referral && <Detail label="Referral" value={visit.referral} />}
                {visit.notes && <Detail label="Notes" value={visit.notes} span />}
              </div>

              {visit.followUpAt && (
                <p className="mt-3 text-xs text-slate-400">
                  Follow-up: {formatEthiopianDisplay(visit.followUpAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <input
        name={name}
        type="text"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
      />
    </div>
  );
}

function Detail({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-slate-700">{value}</p>
    </div>
  );
}







