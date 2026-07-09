import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import IssueForm from "./IssueForm";
import ResponseForm from "./ResponseForm";

export default async function IssuesPage() {
  const session = await auth();
  const role = session!.user!.role;

  if (role === "PARENT") {
    const parentProfile = await prisma.parent.findUnique({
      where: { userId: session!.user!.id },
      include: {
        parentIssues: {
          include: { response: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const issues = parentProfile?.parentIssues ?? [];

    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-gray-900">Contact the School</h1>

        <section className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 font-medium text-gray-900">Submit a New Issue</h2>
          <IssueForm />
        </section>

        <section className="space-y-3">
          <h2 className="font-medium text-gray-900">Your Messages</h2>
          {issues.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="rounded-lg border bg-white p-4">
                <p className="text-sm text-gray-900">{issue.message}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {issue.createdAt.toLocaleDateString()} —{" "}
                  <span className={issue.status === "OPEN" ? "text-yellow-600" : "text-green-600"}>
                    {issue.status}
                  </span>
                </p>
                {issue.response && (
                  <div className="mt-3 rounded bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">School's Response:</p>
                    <p className="mt-1 text-sm text-gray-800">{issue.response.message}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    );
  }

  // Admin / Teacher view
  const issues = await prisma.parentIssue.findMany({
    include: { parent: { include: { user: true } }, response: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const open = issues.filter((i) => i.status === "OPEN");
  const responded = issues.filter((i) => i.status === "RESPONDED");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Parent Issues</h1>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Open ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-sm text-gray-500">No open issues.</p>
        ) : (
          <div className="space-y-4">
            {open.map((issue) => (
              <div key={issue.id} className="rounded border p-3">
                <p className="text-sm font-medium text-gray-900">{issue.parent.fullName}</p>
                <p className="mt-1 text-sm text-gray-700">{issue.message}</p>
                <p className="mt-1 text-xs text-gray-400">{issue.createdAt.toLocaleDateString()}</p>
                <ResponseForm issueId={issue.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Responded ({responded.length})</h2>
        {responded.length === 0 ? (
          <p className="text-sm text-gray-500">No responded issues yet.</p>
        ) : (
          <div className="space-y-4">
            {responded.map((issue) => (
              <div key={issue.id} className="rounded border p-3">
                <p className="text-sm font-medium text-gray-900">{issue.parent.fullName}</p>
                <p className="mt-1 text-sm text-gray-700">{issue.message}</p>
                {issue.response && (
                  <div className="mt-2 rounded bg-gray-50 p-2">
                    <p className="text-xs text-gray-500">Response:</p>
                    <p className="text-sm text-gray-800">{issue.response.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}