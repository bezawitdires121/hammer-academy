import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { Activity, Heart } from "lucide-react";

const outcomeColors: Record<string, string> = {
  RECOVERED: "bg-green-100 text-green-700",
  REFERRED: "bg-yellow-100 text-yellow-700",
  UNDER_OBSERVATION: "bg-blue-100 text-blue-700",
  OTHER: "bg-slate-100 text-slate-600",
};

export default async function StudentHealthPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      healthConditions: { orderBy: { createdAt: "asc" } },
      healthVisits: { orderBy: { visitDate: "desc" }, take: 20 },
    },
  });

  if (!student) redirect("/dashboard/student");

  const today = new Date();
  const followUps = student.healthVisits.filter(
    (v) => v.followUpAt && new Date(v.followUpAt) >= today
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Health</h1>
        <p className="mt-1 text-sm text-slate-500">Your health records and visit history.</p>
      </div>

      {/* Follow-ups due */}
      {followUps.length > 0 && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800">
            You have {followUps.length} upcoming follow-up{followUps.length !== 1 ? "s" : ""}
          </p>
          <ul className="mt-2 space-y-1">
            {followUps.map((v) => (
              <li key={v.id} className="text-sm text-yellow-700">
                · {formatEthiopianDisplay(v.followUpAt!)}
                {v.reason && ` — ${v.reason}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conditions */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Health Conditions</h2>
        </div>
        {student.healthConditions.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No conditions on record.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-5">
            {student.healthConditions.map((c) => (
              <div key={c.id} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-sm font-semibold text-red-800">{c.name}</p>
                {c.details && <p className="mt-0.5 text-xs text-red-600">{c.details}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Visit history */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Visit History</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {student.healthVisits.length} visit{student.healthVisits.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        {student.healthVisits.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No visits recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {student.healthVisits.map((v) => (
              <div key={v.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatEthiopianDisplay(v.visitDate)}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${outcomeColors[v.outcome] ?? "bg-slate-100 text-slate-600"}`}>
                    {v.outcome.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {v.reason && <p className="text-slate-600"><span className="font-medium">Reason:</span> {v.reason}</p>}
                  {v.treatment && <p className="text-slate-600"><span className="font-medium">Treatment:</span> {v.treatment}</p>}
                  {v.medication && <p className="text-slate-600"><span className="font-medium">Medication:</span> {v.medication}</p>}
                  {v.referral && <p className="text-slate-600"><span className="font-medium">Referral:</span> {v.referral}</p>}
                </div>
                {v.followUpAt && (
                  <p className="mt-2 text-xs text-slate-400">
                    Follow-up: {formatEthiopianDisplay(v.followUpAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
