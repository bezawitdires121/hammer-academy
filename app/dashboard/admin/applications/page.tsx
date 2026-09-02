import { prisma } from "@/lib/prisma";
import ApplicationCard from "./ApplicationCard";

export default async function TeacherApplicationsPage() {
  const applications = await prisma.teacherApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-primary">Teacher Applications</h1>
        <p className="text-sm text-gray-500">
          {pending.length} pending review
        </p>
      </div>

      <section className="space-y-4">
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
            No pending applications.
          </p>
        ) : (
          pending.map((app) => <ApplicationCard key={app.id} application={app} />)
        )}
      </section>

      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-500">Previously Reviewed</h2>
          <div className="space-y-2">
            {reviewed.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  {app.photoUrl ? (
  <img
    src={app.photoUrl}
    alt={app.fullName}
    className="h-8 w-8 rounded-full object-cover"
  />
) : (
  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
    {app.fullName.charAt(0).toUpperCase()}
  </div>
)}
                  <span className="text-gray-900">{app.fullName}</span>
                </div>
                <span
  className={
    app.status === "ACCEPTED"
      ? "rounded-full bg-brand-success/10 px-2.5 py-1 text-xs font-bold text-brand-success"
      : app.status === "REJECTED"
        ? "rounded-full bg-brand-danger/10 px-2.5 py-1 text-xs font-bold text-brand-danger"
        : "rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary"
  }
>
  {app.status.replace("_", " ")}
</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}