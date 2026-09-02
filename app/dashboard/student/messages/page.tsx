import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireStudent } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { MessageSquare } from "lucide-react";
import { sendTeacherMessage, sendAdminMessage } from "@/app/dashboard/messages/actions";

export default async function StudentMessagesPage() {
  const session = await requireStudent();

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      teacherMessages: {
        include: { teacher: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      adminMessages: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          section: {
            include: {
              subjectAssignments: { include: { teacher: true } },
              homeroomTeacher: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!student) return null;

  // Collect unique teachers the student can message
  const teacherMap = new Map<string, { id: string; fullName: string }>();
  const section = student.enrollments[0]?.section;
  if (section?.homeroomTeacher) {
    teacherMap.set(section.homeroomTeacher.id, section.homeroomTeacher);
  }
  section?.subjectAssignments.forEach((a) => teacherMap.set(a.teacher.id, a.teacher));
  // Also include teachers already in message history
  student.teacherMessages.forEach((m) => teacherMap.set(m.teacher.id, m.teacher));

  const teachers = Array.from(teacherMap.values()).sort((a, b) => {
    const aLatest = student.teacherMessages.find(
      (message) => message.teacherId === a.id
    )?.createdAt?.getTime() ?? 0;

    const bLatest = student.teacherMessages.find(
      (message) => message.teacherId === b.id
    )?.createdAt?.getTime() ?? 0;

    return bLatest - aLatest;
  });

  // Group teacher messages by teacher
  const byTeacher = new Map<string, typeof student.teacherMessages>();
  for (const msg of student.teacherMessages) {
    const arr = byTeacher.get(msg.teacherId) ?? [];
    arr.push(msg);
    byTeacher.set(msg.teacherId, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your conversations with teachers and school administration.
        </p>
      </div>

      {/* Teacher threads */}
      <section className="space-y-4">
        <h2 className="font-bold text-slate-900">Teacher Messages</h2>

        {teachers.length === 0 && byTeacher.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No teachers assigned yet.</p>
          </div>
        ) : (
          teachers.map((teacher) => {
            const msgs = byTeacher.get(teacher.id) ?? [];
            return (
              <div key={teacher.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="font-bold text-slate-900">{teacher.fullName}</p>
                </div>
                {msgs.length > 0 && (
                  <div className="divide-y divide-slate-100">
                    {msgs.map((msg) => (
                      <div key={msg.id} className={`px-5 py-3 ${msg.senderRole === "STUDENT" ? "bg-brand-primary/5" : ""}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-500">
                            {msg.senderRole === "STUDENT" ? "You" : teacher.fullName}
                          </p>
                          <p className="text-xs text-slate-400">{formatEthiopianDisplay(msg.createdAt)}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                <SendTeacherMessageForm teacherId={teacher.id} />
              </div>
            );
          })
        )}
      </section>

      {/* Admin thread */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">School / Admin</h2>
        </div>
        {student.adminMessages.length > 0 && (
          <div className="divide-y divide-slate-100">
            {student.adminMessages.map((msg) => (
              <div key={msg.id} className={`px-5 py-3 ${msg.senderRole === "STUDENT" ? "bg-brand-primary/5" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">
                    {msg.senderRole === "STUDENT" ? "You" : "School Admin"}
                  </p>
                  <p className="text-xs text-slate-400">{formatEthiopianDisplay(msg.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
        <SendAdminMessageForm />
      </section>
    </div>
  );
}

function SendTeacherMessageForm({ teacherId }: { teacherId: string }) {
  async function handle(fd: FormData) {
    "use server";
    const msg = fd.get("message") as string;
    await sendTeacherMessage(teacherId, msg);
  }
  return (
    <form action={handle} className="flex gap-2 border-t border-slate-100 p-4">
      <input
        name="message"
        placeholder="Write a message…"
        required
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
      />
      <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
        Send
      </button>
    </form>
  );
}

function SendAdminMessageForm() {
  async function handle(fd: FormData) {
    "use server";
    const msg = fd.get("message") as string;
    await sendAdminMessage(msg);
  }
  return (
    <form action={handle} className="flex gap-2 border-t border-slate-100 p-4">
      <input
        name="message"
        placeholder="Write a message to admin…"
        required
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
      />
      <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
        Send
      </button>
    </form>
  );
}



