import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { BookOpen, BookMarked } from "lucide-react";

const statusStyles: Record<string, string> = {
  BORROWED: "bg-blue-50 text-blue-700",
  OVERDUE: "bg-red-50 text-red-700",
  RETURNED: "bg-green-50 text-green-700",
  LOST: "bg-red-100 text-red-800",
  DAMAGED: "bg-amber-50 text-amber-700",
};

export default async function StudentLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      loans: {
        include: { bookCopy: { include: { book: true } } },
        orderBy: { borrowedAt: "desc" },
      },
      studentLibraryRoles: true,
    },
  });

  if (!student) redirect("/dashboard/student");

  const today = new Date();
  const active = student.loans.filter((l) => l.status === "BORROWED");
  const history = student.loans.filter((l) => l.status !== "BORROWED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Library</h1>
        <p className="mt-1 text-sm text-slate-500">Your borrowed books and borrowing history.</p>
      </div>

      {student.studentLibraryRoles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {student.studentLibraryRoles.map((r) => (
            <span key={r.id} className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
              {r.role}
            </span>
          ))}
        </div>
      )}

      {/* Active loans */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Currently Borrowed</h2>
          <p className="mt-0.5 text-xs text-slate-500">{active.length} active loan{active.length !== 1 ? "s" : ""}</p>
        </div>
        {active.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <BookMarked className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No books currently borrowed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {active.map((loan) => {
              const isOverdue = loan.dueAt < today;
              return (
                <div key={loan.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                    <BookOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{loan.bookCopy.book.title}</p>
                    {loan.bookCopy.book.author && (
                      <p className="text-sm text-slate-500">{loan.bookCopy.book.author}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      Borrowed {formatEthiopianDisplay(loan.borrowedAt)}
                    </p>
                    <p className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
                      Due {formatEthiopianDisplay(loan.dueAt)}
                      {isOverdue && " — OVERDUE"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${isOverdue ? statusStyles.OVERDUE : statusStyles.BORROWED}`}>
                    {isOverdue ? "Overdue" : "Borrowed"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      {history.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Borrowing History</h2>
            <p className="mt-0.5 text-xs text-slate-500">{history.length} past loan{history.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((loan) => (
              <div key={loan.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <BookOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{loan.bookCopy.book.title}</p>
                  {loan.bookCopy.book.author && (
                    <p className="text-sm text-slate-500">{loan.bookCopy.book.author}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Borrowed {formatEthiopianDisplay(loan.borrowedAt)}
                    {loan.returnedAt && ` · Returned ${formatEthiopianDisplay(loan.returnedAt)}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[loan.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {loan.status.charAt(0) + loan.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
