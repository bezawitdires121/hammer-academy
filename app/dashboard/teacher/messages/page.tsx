import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { MessageSquare } from "lucide-react";
import { replyToStudent } from "@/app/dashboard/messages/actions";

export default async function TeacherMessagesPage() {
  const session = await requireTeacher();

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      messagesReceived: {
        include: { student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });

  if (!teacher) return null;

  // Group by student
  const byStudent = new Map<string, typeof teacher.messagesReceived>();
  for (const msg of teacher.messagesReceived) {
    const arr = byStudent.get(msg.studentId) ?? [];
    arr.push(msg);
    byStudent.set(msg.studentId, arr);
  }

  const conversations = Array.from(byStudent.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">Student conversations.</p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">No messages yet</h2>
          <p className="mt-1 text-sm text-slate-500">Messages from your students will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((msgs) => {
            const student = msgs[0].student;
            const unread = msgs.filter((m) => !m.readAt && m.senderRole === "STUDENT").length;
            return (
              <div key={student.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 font-bold text-brand-primary">
                      {student.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{student.fullName}</p>
                      <p className="font-mono text-xs text-slate-400">{student.studentLoginId}</p>
                    </div>
                  </div>
                  {unread > 0 && (
                    <span className="rounded-full bg-brand-primary px-2.5 py-0.5 text-xs font-bold text-white">
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {msgs.map((msg) => (
                    <div key={msg.id} className={`px-4 py-3 ${msg.senderRole === "TEACHER" ? "bg-brand-primary/5" : ""}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">
                          {msg.senderRole === "STUDENT" ? student.fullName : "You"}
                        </p>
                        <p className="text-xs text-slate-400">{formatEthiopianDisplay(msg.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <ReplyForm studentId={student.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReplyForm({ studentId }: { studentId: string }) {
  async function handle(fd: FormData) {
    "use server";
    const msg = fd.get("message") as string;
    await replyToStudent(studentId, msg);
  }
  return (
    <form action={handle} className="flex gap-2 border-t border-slate-100 p-4">
      <input
        name="message"
        placeholder="Reply…"
        required
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary"
      />
      <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
        Send
      </button>
    </form>
  );
}



