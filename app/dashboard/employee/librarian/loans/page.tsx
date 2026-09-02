import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";



import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Plus,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import { issueLoan, updateLoanStatus } from "../actions";

type Props = {
  searchParams: Promise<{
    status?: string;
    issue?: string;
    q?: string;
  }>;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "BORROWED", label: "Active" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "RETURNED", label: "Returned" },
  { value: "LOST", label: "Lost" },
  { value: "DAMAGED", label: "Damaged" },
];

const statusStyles: Record<string, string> = {
  BORROWED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  OVERDUE: "bg-red-50 text-red-700 ring-red-600/20",
  RETURNED: "bg-green-50 text-green-700 ring-green-600/20",
  LOST: "bg-red-100 text-red-800 ring-red-700/20",
  DAMAGED: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

function statusLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default async function LibrarianLoansPage({ searchParams }: Props) {
  await requireRole(["LIBRARIAN", "ADMIN"]);

  const { status = "", issue, q = "" } = await searchParams;
  const today = new Date();

  const loans = await prisma.loan.findMany({
    where: {
      ...(status === "OVERDUE"
        ? {
            status: "BORROWED",
            dueAt: { lt: today },
          }
        : status
          ? { status: status as never }
          : undefined),

      ...(q
        ? {
            OR: [
              {
                student: {
                  fullName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
              {
                student: {
                  studentLoginId: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
              {
                bookCopy: {
                  book: {
                    title: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : undefined),
    },

    include: {
      student: { select: { id: true, fullName: true, photoUrl: true, studentLoginId: true } },
      bookCopy: {
        include: {
          book: true,
        },
      },
    },

    orderBy: {
      borrowedAt: "desc",
    },

    take: 100,
  });

  const [activeCount, overdueCount, returnedCount, availableCopies] =
    await Promise.all([
      prisma.loan.count({
        where: { status: "BORROWED" },
      }),

      prisma.loan.count({
        where: {
          status: "BORROWED",
          dueAt: { lt: today },
        },
      }),

      prisma.loan.count({
        where: { status: "RETURNED" },
      }),

      issue === "1"
        ? prisma.bookCopy.findMany({
            where: {
              loans: {
                none: {
                  status: "BORROWED",
                },
              },
            },
            include: {
              book: true,
            },
            orderBy: {
              book: {
                title: "asc",
              },
            },
            take: 300,
          })
        : Promise.resolve([]),
    ]);

  const students =
    issue === "1"
      ? await prisma.student.findMany({
          orderBy: {
            fullName: "asc",
          },
          take: 500,
          select: {
            id: true,
            fullName: true,
            studentLoginId: true,
          },
        })
      : [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="overflow-hidden rounded-2xl bg-brand-primary shadow-lg">
        <div className="flex flex-col gap-5 px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/70">
              <BookMarked size={17} />
              <span className="text-sm font-medium">Library Circulation</span>
            </div>

            <h1 className="mt-2 text-2xl font-bold">
              Loans & Returns
            </h1>

            <p className="mt-1 text-sm text-white/75">
              Issue books, track due dates, and process returns.
            </p>
          </div>

          <Link
            href="?issue=1"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-primary shadow-sm transition hover:bg-slate-50"
          >
            <Plus size={17} />
            Issue Book
          </Link>
        </div>
      </section>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Active Loans"
          value={activeCount}
          icon={BookMarked}
          tone="blue"
        />

        <SummaryCard
          label="Overdue"
          value={overdueCount}
          icon={AlertCircle}
          tone="red"
        />

        <SummaryCard
          label="Returned"
          value={returnedCount}
          icon={CheckCircle2}
          tone="green"
        />

        <SummaryCard
          label="Available Copies"
          value={availableCopies.length}
          icon={BookOpen}
          tone="slate"
        />
      </div>

      {/* ISSUE FORM */}
      {issue === "1" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <ClipboardCheck size={19} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Issue a book
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Select the student, available copy, and lending period.
                </p>
              </div>
            </div>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await issueLoan(fd);
            }}
            className="p-6"
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <SelectField
                name="studentId"
                label="Student"
                required
                placeholder="Select student..."
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} ({student.studentLoginId})
                  </option>
                ))}
              </SelectField>

              <SelectField
                name="bookCopyId"
                label="Available book copy"
                required
                placeholder={
                  availableCopies.length
                    ? "Select book copy..."
                    : "No available copies"
                }
              >
                {availableCopies.map((copy) => (
                  <option key={copy.id} value={copy.id}>
                    {copy.book.title} — Copy #{copy.copyNo}
                    {copy.condition ? ` (${copy.condition})` : ""}
                  </option>
                ))}
              </SelectField>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Loan period
                </label>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    name="dueDays"
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={14}
                    required
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-16 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    days
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Default lending period: 14 days.
                </p>
              </div>
            </div>

            {availableCopies.length === 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                There are currently no available book copies to issue.
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={availableCopies.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BookMarked size={17} />
                Issue Book
              </button>

              <Link
                href="/dashboard/employee/librarian/loans"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      )}

      {/* SEARCH */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              name="q"
              defaultValue={q}
              placeholder="Search student, login ID, or book title..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>

          {status && (
            <input type="hidden" name="status" value={status} />
          )}

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Search
          </button>

          {q && (
            <Link
              href={
                status
                  ? `/dashboard/employee/librarian/loans?status=${status}`
                  : "/dashboard/employee/librarian/loans"
              }
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
      </section>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = status === filter.value;

          const href = filter.value
            ? `/dashboard/employee/librarian/loans?status=${filter.value}`
            : "/dashboard/employee/librarian/loans";

          return (
            <Link
              key={filter.value || "all"}
              href={href}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                active
                  ? "bg-brand-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {/* LOANS */}
      {loans.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-bold text-slate-900">
            No loans found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {q
              ? "Try a different student or book search."
              : status
                ? `There are no ${status.toLowerCase()} loans.`
                : "No lending records have been created yet."}
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Loan Records
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {loans.length} record{loans.length !== 1 ? "s" : ""}
                </p>
              </div>

              <BookMarked size={20} className="text-slate-300" />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loans.map((loan) => {
              const isOverdue =
                loan.status === "BORROWED" && loan.dueAt < today;

              const displayStatus = isOverdue
                ? "OVERDUE"
                : loan.status;

              const canAct = loan.status === "BORROWED";

              return (
                <div
                  key={loan.id}
                  className="p-5 transition hover:bg-slate-50/60"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      {/* BOOK */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                          <BookOpen size={18} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900">
                            {loan.bookCopy.book.title}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound size={14} />
                              {loan.student.fullName}
                            </span>

                            <span>
                              Copy #{loan.bookCopy.copyNo}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DATES */}
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <Clock3 size={14} />
                          Borrowed{" "}
                          {formatEthiopianDisplay(loan.borrowedAt)}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            isOverdue
                              ? "font-bold text-red-600"
                              : "text-slate-500"
                          }`}
                        >
                          <CalendarDays size={14} />
                          Due {formatEthiopianDisplay(loan.dueAt)}
                        </span>

                        {loan.returnedAt && (
                          <span className="inline-flex items-center gap-1.5 text-green-600">
                            <RotateCcw size={14} />
                            Returned{" "}
                            {formatEthiopianDisplay(loan.returnedAt)}
                          </span>
                        )}
                      </div>

                      {loan.notes && (
                        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                          <span className="font-bold">Notes:</span>{" "}
                          {loan.notes}
                        </div>
                      )}

                      {/* ACTIONS */}
                      {canAct && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <LoanActionForm
                            loanId={loan.id}
                            action="RETURNED"
                            label="Return Book"
                            className="bg-green-600 hover:bg-green-700"
                          />

                          <LoanActionForm
                            loanId={loan.id}
                            action="LOST"
                            label="Mark Lost"
                            className="bg-red-600 hover:bg-red-700"
                          />

                          <LoanActionForm
                            loanId={loan.id}
                            action="DAMAGED"
                            label="Mark Damaged"
                            className="bg-amber-500 hover:bg-amber-600"
                          />
                        </div>
                      )}
                    </div>

                    {/* STATUS */}
                    <span
                      className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                        statusStyles[displayStatus] ??
                        "bg-slate-100 text-slate-600 ring-slate-500/20"
                      }`}
                    >
                      {statusLabel(displayStatus)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {loans.length === 100 && (
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center text-xs text-slate-500">
              Showing the latest 100 records.
            </div>
          )}
        </section>
      )}

      <Link
        href="/dashboard/employee/librarian"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-primary"
      >
        Back to Library Dashboard
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
  tone: "blue" | "red" | "green" | "slate";
}) {
  const styles = {
    blue: "bg-brand-primary/10 text-brand-primary",
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SelectField({
  name,
  label,
  required,
  placeholder,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}
      </label>

      <select
        name={name}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}

function LoanActionForm({
  loanId,
  action,
  label,
  className,
}: {
  loanId: string;
  action: "RETURNED" | "LOST" | "DAMAGED";
  label: string;
  className: string;
}) {
  async function handle() {
    "use server";

    await updateLoanStatus(loanId, action);
  }

  return (
    <form action={handle}>
      <button
        type="submit"
        className={`rounded-lg px-3 py-2 text-xs font-bold text-white transition ${className}`}
      >
        {label}
      </button>
    </form>
  );
}



