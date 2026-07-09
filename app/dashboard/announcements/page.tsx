import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import AnnouncementForm from "./AnnouncementForm";

export default async function AnnouncementsPage() {
  const session = await auth();
  const role = session!.user!.role;

  const classes = await prisma.class.findMany();

  let announcements;

  if (role === "PARENT") {
    // A parent should only see: school-wide announcements, announcements for
    // their child's grade, or announcements for their child's specific class
    const parentProfile = await prisma.parent.findUnique({
      where: { userId: session!.user!.id },
      include: { students: { include: { student: { include: { class: true } } } } },
    });

    const childClassIds = parentProfile?.students.map((ps: { student: { classId: string } }) => ps.student.classId) ?? [];
    const childGrades = parentProfile?.students.map((ps: { student: { class: { grade: number } } }) => ps.student.class.grade) ?? [];

    announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { scope: "SCHOOL_WIDE" },
          { scope: "GRADE", grade: { in: childGrades } },
          { scope: "CLASS", classId: { in: childClassIds } },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  } else {
    // Admin and teachers see everything
    announcements = await prisma.announcement.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: { class: true },
    });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>

      {(role === "ADMIN" || role === "TEACHER") && (
        <section className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 font-medium text-gray-900">Post New Announcement</h2>
          <AnnouncementForm classes={classes.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))} />
        </section>
      )}

      <section className="space-y-3">
        {announcements.length === 0 ? (
          <p className="text-gray-500">No announcements yet.</p>
        ) : (
          announcements.map((a: { id: string; title: string; body: string; priority: boolean; createdAt: Date; scope: string }) => (
            <div
              key={a.id}
              className={`rounded-lg border p-4 ${
                a.priority ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{a.title}</h3>
                {a.priority && (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    Priority
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{a.body}</p>
              <p className="mt-2 text-xs text-gray-400">
                {a.createdAt.toLocaleDateString()} — {a.scope.replace("_", " ")}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}