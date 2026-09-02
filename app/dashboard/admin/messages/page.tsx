import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  markAdminMessageRead,
  replyToStudentAsAdmin,
} from "@/app/dashboard/messages/actions";
import {
  Check,
  CheckCheck,
  MessageSquare,
  Send,
  User,
} from "lucide-react";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminMessagesPage() {
  await requireAdmin();

  /*
   * IMPORTANT:
   * This page is intentionally ADMIN <-> STUDENT only.
   *
   * Teachers are NOT loaded here.
   * Teacher messaging is a separate concern.
   */

  const messages = await prisma.studentAdminMessage.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      studentId: true,
      message: true,
      readAt: true,
      handledById: true,
      senderRole: true,
      createdAt: true,
    },
  });

  /*
   * Load students separately instead of depending on a Prisma
   * relation named "student".
   */
  const studentIds = Array.from(
    new Set(messages.map((message) => message.studentId))
  );

  const students =
    studentIds.length > 0
      ? await prisma.student.findMany({
          where: {
            id: {
              in: studentIds,
            },
          },
          select: {
            id: true,
            fullName: true,
            studentLoginId: true,
          },
        })
      : [];

  const studentMap = new Map(
    students.map((student) => [student.id, student])
  );

  /*
   * Group messages by student.
   */
  const conversations = new Map<
    string,
    typeof messages
  >();

  for (const message of messages) {
    const existing = conversations.get(message.studentId) ?? [];
    existing.push(message);
    conversations.set(message.studentId, existing);
  }

  /*
   * Most recently active conversation first.
   */
  const conversationList = Array.from(
    conversations.entries()
  ).sort(([, a], [, b]) => {
    const aLast =
      a[a.length - 1]?.createdAt.getTime() ?? 0;

    const bLast =
      b[b.length - 1]?.createdAt.getTime() ?? 0;

    return bLast - aLast;
  });

  const totalMessages = messages.length;

  const unreadMessages = messages.filter(
    (message) =>
      message.senderRole === "STUDENT" &&
      !message.readAt
  ).length;

  const activeConversations = conversationList.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10">
            <MessageSquare
              className="h-6 w-6 text-brand-primary"
              strokeWidth={2}
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Messages
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Communicate directly with students.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Conversations
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {activeConversations}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Unread
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {unreadMessages}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total Messages
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalMessages}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {conversationList.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No messages yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Messages from students will appear here.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {conversationList.map(
            ([studentId, conversation]) => {
              const student = studentMap.get(studentId);

              /*
               * A message can theoretically reference a student
               * that no longer exists. Skip that conversation safely.
               */
              if (!student) {
                return null;
              }

              const unreadCount = conversation.filter(
                (message) =>
                  message.senderRole === "STUDENT" &&
                  !message.readAt
              ).length;

              return (
                <section
                  key={student.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Student header */}
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10">
                        <User
                          className="h-5 w-5 text-brand-primary"
                          strokeWidth={2}
                        />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          {student.fullName}
                        </h2>

                        <p className="text-xs text-slate-500">
                          Student ID:{" "}
                          {student.studentLoginId}
                        </p>
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <span className="inline-flex w-fit items-center rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="space-y-4 p-5">
                    {conversation.map((message) => {
                      const isStudent =
                        message.senderRole === "STUDENT";

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isStudent
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-3xl rounded-2xl px-4 py-3 ${
                              isStudent
                                ? "bg-slate-100 text-slate-800"
                                : "bg-brand-primary text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span
                                className={`text-xs font-bold ${
                                  isStudent
                                    ? "text-slate-500"
                                    : "text-white/80"
                                }`}
                              >
                                {isStudent
                                  ? "Student"
                                  : "Admin"}
                              </span>

                              <span
                                className={`text-[11px] ${
                                  isStudent
                                    ? "text-slate-400"
                                    : "text-white/60"
                                }`}
                              >
                                {formatDate(
                                  message.createdAt
                                )}
                              </span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                              {message.message}
                            </p>

                            <div className="mt-2 flex items-center justify-end gap-1">
                              {isStudent ? (
                                message.readAt ? (
                                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    Read
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Unread
                                  </span>
                                )
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] text-white/60">
                                  <Check className="h-3.5 w-3.5" />
                                  Sent
                                </span>
                              )}
                            </div>

                            {isStudent &&
                              !message.readAt && (
                                <form
                                  action={markAdminMessageRead.bind(
                                    null,
                                    message.id
                                  )}
                                  className="mt-3"
                                >
                                  <button
                                    type="submit"
                                    className="text-xs font-semibold text-brand-primary hover:underline"
                                  >
                                    Mark as read
                                  </button>
                                </form>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply */}
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <form
                      action={replyToStudentAsAdmin.bind(
                        null,
                        student.id
                      )}
                      className="space-y-3"
                    >
                      <label
                        htmlFor={`reply-${student.id}`}
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Reply to {student.fullName}
                      </label>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <textarea
                          id={`reply-${student.id}`}
                          name="message"
                          required
                          rows={3}
                          placeholder="Write a reply..."
                          className="min-h-[84px] flex-1 resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                        />

                        <button
                          type="submit"
                          className="inline-flex h-fit items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
                        >
                          <Send className="h-4 w-4" />
                          Reply
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
