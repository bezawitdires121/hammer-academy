import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BookMarked,
  ClipboardCheck,
  Library,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  Users,
} from "lucide-react";

export default async function LibrarianPage() {
  await requireRole(["LIBRARIAN", "ADMIN"]);
  const session = await auth();

  const employee = await prisma.employee.findFirst({
    where: { userId: session!.user!.id },
  });

  const today = new Date();

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const [
    totalBooks,
    totalCopies,
    activeLoans,
    overdueLoans,
    dueToday,
    returnedToday,
    recentLoans,
  ] = await Promise.all([
    prisma.book.count(),

    prisma.bookCopy.count(),

    prisma.loan.count({
      where: {
        status: "BORROWED",
      },
    }),

    prisma.loan.count({
      where: {
        status: "BORROWED",
        dueAt: {
          lt: today,
        },
      },
    }),

    prisma.loan.count({
      where: {
        status: "BORROWED",
        dueAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
      },
    }),

    prisma.loan.count({
      where: {
        returnedAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
      },
    }),

    prisma.loan.findMany({
      include: {
        student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } },
        bookCopy: {
          include: {
            book: true,
          },
        },
      },
      orderBy: {
        dueAt: "asc",
      },
      take: 8,
    }),
  ]);

  const availableCopies = Math.max(totalCopies - activeLoans, 0);

  const librarianName = employee?.fullName ?? "Library Staff";

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="overflow-hidden rounded-3xl bg-brand-primary text-white shadow-lg">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                <Library size={16} />
                School Library
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Good day, {librarianName.split(" ")[0]}.
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                Manage the school library, track borrowed books, process
                returns, and keep student library records organized.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/employee/librarian/loans?issue=1"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-primary shadow-sm transition hover:bg-slate-50"
              >
                <Plus size={17} />
                Issue Book
              </Link>

              <Link
                href="/dashboard/employee/librarian/loans"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <RotateCcw size={17} />
                Returns
              </Link>
            </div>
          </div>
        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-3">
          <HeaderMetric
            label="Books in catalog"
            value={totalBooks}
            icon={BookOpen}
          />

          <HeaderMetric
            label="Copies available"
            value={availableCopies}
            icon={BookMarked}
          />

          <HeaderMetric
            label="Currently borrowed"
            value={activeLoans}
            icon={ClipboardCheck}
          />
        </div>
      </section>

      {/* ALERTS */}
      {overdueLoans > 0 && (
        <Link
          href="/dashboard/employee/librarian/loans?filter=overdue"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 transition hover:border-red-300"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle size={19} />
            </div>

            <div>
              <p className="font-bold text-red-900">
                {overdueLoans} overdue{" "}
                {overdueLoans === 1 ? "book" : "books"}
              </p>

              <p className="mt-0.5 text-sm text-red-700">
                Review overdue loans and follow up with students.
              </p>
            </div>
          </div>

          <ArrowRight
            size={18}
            className="text-red-500 transition group-hover:translate-x-1"
          />
        </Link>
      )}

      {/* TODAY */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Today's library</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Activity requiring your attention today.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TodayCard
            label="Due today"
            value={dueToday}
            description="Books expected back today"
            icon={BookMarked}
            href="/dashboard/employee/librarian/loans"
          />

          <TodayCard
            label="Returned today"
            value={returnedToday}
            description="Books processed as returned"
            icon={RotateCcw}
            href="/dashboard/employee/librarian/loans"
          />

          <TodayCard
            label="Active loans"
            value={activeLoans}
            description="Books currently with students"
            icon={ClipboardCheck}
            href="/dashboard/employee/librarian/loans"
          />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section>
        <div className="mb-3">
          <h2 className="font-bold text-slate-900">Quick actions</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Common library tasks.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/dashboard/employee/librarian/loans?issue=1"
            icon={Plus}
            title="Issue a book"
            description="Record a new student loan"
            primary
          />

          <QuickAction
            href="/dashboard/employee/librarian/loans"
            icon={RotateCcw}
            title="Process return"
            description="Find and return a borrowed book"
          />

          <QuickAction
            href="/dashboard/employee/librarian/books"
            icon={BookOpen}
            title="Manage catalog"
            description="Books and physical copies"
          />

          <QuickAction
            href="/dashboard/employee/librarian/students"
            icon={Users}
            title="Student library"
            description="View student library records"
          />
        </div>
      </section>

      {/* RECENT LOANS */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Borrowing activity
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Recent library loans and their current status.
            </p>
          </div>

          <Link
            href="/dashboard/employee/librarian/loans"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary"
          >
            View all loans
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentLoans.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No loan activity yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Borrowing activity will appear here once books are issued.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLoans.map((loan) => {
              const isBorrowed = loan.status === "BORROWED";
              const isOverdue =
                isBorrowed && loan.dueAt < today;

              return (
                <div
                  key={loan.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <BookOpen size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {loan.bookCopy.book.title}
                      </p>

                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{loan.student.fullName}</span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Copy {loan.bookCopy.copyNo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <LoanStatus
                    status={loan.status}
                    overdue={isOverdue}
                    dueAt={loan.dueAt}
                    returnedAt={loan.returnedAt}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SEARCH / MANAGEMENT */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/dashboard/employee/librarian/books"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-primary hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Search size={20} />
            </div>

            <ArrowRight
              size={18}
              className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-primary"
            />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Find a book
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Search the catalog, check availability, and manage physical
            copies.
          </p>
        </Link>

        <Link
          href="/dashboard/employee/librarian/students"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-primary hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <UserRound size={20} />
            </div>

            <ArrowRight
              size={18}
              className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-primary"
            />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Student library records
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Review borrowing history, active loans, overdue books, and
            student library roles.
          </p>
        </Link>
      </section>
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
        <Icon size={17} />
      </div>

      <div>
        <p className="text-xs font-medium text-white/60">
          {label}
        </p>

        <p className="mt-0.5 text-lg font-bold">
          {value}
        </p>
      </div>
    </div>
  );
}

function TodayCard({
  label,
  value,
  description,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-primary">
        Open loans
        <ArrowRight
          size={13}
          className="transition group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 transition ${
        primary
          ? "border-brand-primary bg-brand-primary text-white shadow-sm hover:shadow-md"
          : "border-slate-200 bg-white text-slate-900 shadow-sm hover:border-brand-primary hover:shadow-md"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          primary
            ? "bg-white/10 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon size={18} />
      </div>

      <p
        className={`mt-3 text-sm font-bold ${
          primary ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </p>

      <p
        className={`mt-1 text-xs leading-5 ${
          primary ? "text-white/70" : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </Link>
  );
}

function LoanStatus({
  status,
  overdue,
  dueAt,
  returnedAt,
}: {
  status: string;
  overdue: boolean;
  dueAt: Date;
  returnedAt: Date | null;
}) {
  if (status !== "BORROWED") {
    return (
      <span className="shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
        Returned
        {returnedAt
          ? ` ${formatEthiopianDisplay(returnedAt)}`
          : ""}
      </span>
    );
  }

  if (overdue) {
    return (
      <span className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
        Overdue
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
      Due {formatEthiopianDisplay(dueAt)}
    </span>
  );
}




