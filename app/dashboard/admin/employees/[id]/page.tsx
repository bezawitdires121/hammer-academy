import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { prisma } from "@/lib/prisma";
import EmployeeActions from "./EmployeeActions";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  Clock,
  HeartPulse,
  Users,
} from "lucide-react";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeeDetail({
  params,
}: Props) {
  const { id } = await params;

  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
    },
  });

  if (!employee) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">
          Employee not found
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          The requested employee could not be found.
        </p>

        <Link
          href="/dashboard/admin/employees"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0f2a47] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Staff Directory
        </Link>
      </div>
    );
  }
  /*
   * ------------------------------------------------
   * LIBRARIAN STAFF MANAGEMENT
   * ------------------------------------------------
   */

  if (employee.role === "LIBRARIAN") {
    const userId = employee.userId;

    const [
      totalBooks,
      totalCopies,
      activeLoans,
      overdueLoans,
      returnedToday,
      lostBooks,
      damagedBooks,
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
            lt: new Date(),
          },
        },
      }),

      prisma.loan.count({
        where: {
          status: "RETURNED",
          returnedAt: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              new Date().getDate()
            ),
            lt: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              new Date().getDate() + 1
            ),
          },
        },
      }),

      prisma.loan.count({
        where: {
          status: "LOST",
        },
      }),

      prisma.loan.count({
        where: {
          status: "DAMAGED",
        },
      }),

      userId
        ? prisma.loan.findMany({
            where: {
              createdById: userId,
            },
            include: {
              student: true,
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
          })
        : [],
    ]);

    const availableCopies = Math.max(
      totalCopies - activeLoans,
      0
    );

    const accountStatus = !employee.user
      ? "NO ACCOUNT"
      : employee.user.isActive
        ? "ACTIVE"
        : "INACTIVE";

    return (
      <div className="space-y-6">
        {/* BACK */}
        <Link
          href="/dashboard/admin/employees"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#0f2a47]"
        >
          <ArrowLeft size={16} />
          Staff Directory
        </Link>

        {/* HEADER */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-[#0f2a47] px-6 py-7 text-white">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-bold">
                  {employee.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={employee.photoUrl}
                      alt={employee.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    employee.fullName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-white/70">
                    Librarian Management
                  </p>

                  <h1 className="mt-1 text-2xl font-bold">
                    {employee.fullName}
                  </h1>

                  <p className="mt-1 text-sm text-white/70">
                    School Library â€¢ Catalog & Student Loans
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    accountStatus === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : accountStatus === "INACTIVE"
                        ? "bg-red-100 text-red-800"
                        : "bg-white/10 text-white"
                  }`}
                >
                  {accountStatus}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  Librarian
                </span>
              </div>
            </div>
          </div>

          {/* STAFF INFORMATION */}
          <div className="p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-gray-900">
                Staff Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Librarian identity, account, and school assignment.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem
                label="Full Name"
                value={employee.fullName}
              />

              <InfoItem
                label="Main Role"
                value="Librarian"
              />

              <InfoItem
                label="Email"
                value={employee.user?.email ?? "Not provided"}
              />

              <InfoItem
                label="Employee Login ID"
                value={
                  employee.employeeLoginId ?? "Not created"
                }
                mono
              />

              <InfoItem
                label="Club Assignment"
                value={
                  employee.clubName ?? "No club assigned"
                }
              />

              <InfoItem
                label="Role Level"
                value={
                  employee.clubType ?? "Not assigned"
                }
              />
            </div>
          </div>
        </section>

        {/* LIBRARY STATISTICS */}
        <section>
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">
              Library Activity
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current library-wide activity and inventory.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Books in Catalog"
              value={totalBooks}
              icon={BookOpen}
              iconClass="bg-blue-50 text-blue-700"
            />

            <StatCard
              label="Available Copies"
              value={availableCopies}
              icon={BookMarked}
              iconClass="bg-green-50 text-green-700"
            />

            <StatCard
              label="Active Loans"
              value={activeLoans}
              icon={ClipboardCheck}
              iconClass="bg-blue-50 text-blue-700"
            />

            <StatCard
              label="Overdue Loans"
              value={overdueLoans}
              icon={AlertTriangle}
              iconClass="bg-red-50 text-red-600"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Returned Today"
              value={returnedToday}
              icon={CalendarCheck}
              iconClass="bg-green-50 text-green-700"
            />

            <StatCard
              label="Lost Books"
              value={lostBooks}
              icon={AlertTriangle}
              iconClass="bg-orange-50 text-orange-700"
            />

            <StatCard
              label="Damaged Books"
              value={damagedBooks}
              icon={AlertTriangle}
              iconClass="bg-red-50 text-red-600"
            />
          </div>
        </section>

        {/* LIBRARIAN ACTIVITY */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Recent Librarian Activity
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Recent loans recorded by this librarian.
              </p>
            </div>

            <Link
              href="/dashboard/employee/librarian/loans"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f2a47] hover:underline"
            >
              Open Library Loans
              <ArrowRight size={15} />
            </Link>
          </div>

          {recentLoans.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <BookOpen size={21} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-gray-900">
                No librarian activity yet
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Loans recorded by this librarian will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentLoans.map((loan) => {
                const isOverdue =
                  loan.status === "BORROWED" &&
                  loan.dueAt < new Date();

                return (
                  <div
                    key={loan.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <BookOpen size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {loan.bookCopy.book.title}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {loan.student.fullName} â€¢ Copy{" "}
                          {loan.bookCopy.copyNo}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {loan.status === "BORROWED" && isOverdue ? (
                        <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                          Overdue
                        </span>
                      ) : loan.status === "BORROWED" ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          Borrowed
                        </span>
                      ) : loan.status === "LOST" ? (
                        <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                          Lost
                        </span>
                      ) : loan.status === "DAMAGED" ? (
                        <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                          Damaged
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                          Returned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* LIBRARY MANAGEMENT */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              Library Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Open the library tools available to this staff member.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <ManagementLink
              href="/dashboard/employee/librarian/books"
              icon={BookOpen}
              title="Book Catalog"
              description="Manage books, physical copies, categories, shelves, and inventory."
            />

            <ManagementLink
              href="/dashboard/employee/librarian/loans"
              icon={ClipboardCheck}
              title="Loans & Returns"
              description="Issue books, process returns, and manage overdue, lost, and damaged loans."
            />

            <ManagementLink
              href="/dashboard/employee/librarian/students"
              icon={Users}
              title="Student Library"
              description="Review student borrowing activity and library roles."
            />
          </div>
        </section>

        {/* ACCOUNT MANAGEMENT */}
        <EmployeeActions
          employeeId={employee.id}
          role={employee.role}
          hasAccount={Boolean(employee.userId)}
          isActive={employee.user?.isActive ?? false}
          employeeLoginId={employee.employeeLoginId}
          clubName={employee.clubName}
          clubType={employee.clubType}
        />
      </div>
    );
  }
  /*
   * ------------------------------------------------
   * HEALTH STAFF MANAGEMENT
   * ------------------------------------------------
   */

  if (employee.role === "HEALTH") {
    const userId = employee.userId;

    const [
      totalVisits,
      visitsThisMonth,
      followUpsPending,
      recentVisits,
      conditionStudents,
    ] = userId
      ? await Promise.all([
          prisma.healthVisit.count({
            where: {
              recordedById: userId,
            },
          }),

          prisma.healthVisit.count({
            where: {
              recordedById: userId,
              visitDate: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1
                ),
              },
            },
          }),

          prisma.healthVisit.count({
            where: {
              recordedById: userId,
              followUpAt: {
                gte: new Date(),
              },
            },
          }),

          prisma.healthVisit.findMany({
            where: {
              recordedById: userId,
            },
            include: {
              student: true,
            },
            orderBy: {
              visitDate: "desc",
            },
            take: 8,
          }),

          prisma.healthCondition.findMany({
            select: {
              studentId: true,
            },
            distinct: ["studentId"],
          }),
        ])
      : [0, 0, 0, [], []];

    const accountStatus = !employee.user
      ? "NO ACCOUNT"
      : employee.user.isActive
        ? "ACTIVE"
        : "INACTIVE";

    return (
      <div className="space-y-6">
        {/* BACK */}
        <Link
          href="/dashboard/admin/employees"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#0f2a47]"
        >
          <ArrowLeft size={16} />
          Staff Directory
        </Link>

        {/* HEADER */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-[#0f2a47] px-6 py-7 text-white">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-bold">
                  {employee.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={employee.photoUrl}
                      alt={employee.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    employee.fullName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-white/70">
                    Health Staff Management
                  </p>

                  <h1 className="mt-1 text-2xl font-bold">
                    {employee.fullName}
                  </h1>

                  <p className="mt-1 text-sm text-white/70">
                    Health Office â€¢ Student Wellness
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    accountStatus === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : accountStatus === "INACTIVE"
                        ? "bg-red-100 text-red-800"
                        : "bg-white/10 text-white"
                  }`}
                >
                  {accountStatus}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  Health
                </span>
              </div>
            </div>
          </div>

          {/* STAFF INFORMATION */}
          <div className="p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-gray-900">
                Staff Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Basic information and current health-office access.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem
                label="Full Name"
                value={employee.fullName}
              />

              <InfoItem
                label="Main Role"
                value="Health"
              />

              <InfoItem
                label="Email"
                value={employee.user?.email ?? "Not provided"}
              />

              <InfoItem
                label="Employee Login ID"
                value={
                  employee.employeeLoginId ?? "Not created"
                }
                mono
              />
              <InfoItem
                label="Role Level"
                value={employee.clubType ?? "Not assigned"}
              />
            </div>
          </div>
        </section>

        {/* HEALTH STATISTICS */}
        <section>
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">
              Health Activity
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Activity recorded by this health staff member.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Visits Recorded"
              value={totalVisits}
              icon={HeartPulse}
              iconClass="bg-red-50 text-red-600"
            />

            <StatCard
              label="Visits This Month"
              value={visitsThisMonth}
              icon={Activity}
              iconClass="bg-blue-50 text-blue-700"
            />

            <StatCard
              label="Follow-ups Pending"
              value={followUpsPending}
              icon={CalendarCheck}
              iconClass="bg-green-50 text-green-700"
            />

            <StatCard
              label="Students With Conditions"
              value={conditionStudents.length}
              icon={AlertTriangle}
              iconClass="bg-orange-50 text-orange-700"
            />
          </div>
        </section>

        {/* RECENT HEALTH ACTIVITY */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Recent Health Activity
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Recent student visits recorded by this staff member.
              </p>
            </div>

            <Link
              href="/dashboard/employee/health/visits"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f2a47] hover:underline"
            >
              Open Health Visits
              <Activity size={15} />
            </Link>
          </div>

          {recentVisits.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <HeartPulse size={21} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-gray-900">
                No health activity yet
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                This health staff member has not recorded any visits.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <HeartPulse size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {visit.student.fullName}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {visit.reason ?? "No reason recorded"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={14} />

                    {formatEthiopianDisplay(visit.visitDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* HEALTH MANAGEMENT */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              Health Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Open the health tools available to this staff member.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <ManagementLink
              href="/dashboard/employee/health/visits"
              icon={HeartPulse}
              title="Health Visits"
              description="Review and record student health visits."
            />

            <ManagementLink
              href="/dashboard/employee/health/students"
              icon={Users}
              title="Student Health Profiles"
              description="View student health history, conditions, and guardian information."
            />
          </div>
        </section>

        {/* ACCOUNT MANAGEMENT */}
        <EmployeeActions
          employeeId={employee.id}
          role={employee.role}
          hasAccount={Boolean(employee.userId)}
          isActive={employee.user?.isActive ?? false}
          employeeLoginId={employee.employeeLoginId}
          clubName={employee.clubName}
          clubType={employee.clubType}
        />
      </div>
    );
  }

  /*
   * ------------------------------------------------
   * EXISTING EMPLOYEE PAGE
   * ------------------------------------------------
   *
   * Teacher, Librarian, and other employees continue
   * using the existing management interface for now.
   *
   * Librarian will be redesigned separately in Step 2.
   */

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/employees"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#0f2a47]"
      >
        <ArrowLeft size={16} />
        Staff Directory
      </Link>

      <div>
        <p className="text-sm font-medium text-[#0f2a47]">
          People / Employees
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          {employee.fullName}
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage staff role, account access, and assignments.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <InfoItem
            label="Full Name"
            value={employee.fullName}
          />

          <InfoItem
            label="Main Role"
            value={roleLabel(employee.role)}
          />

          <InfoItem
            label="Email"
            value={employee.user?.email ?? "Not provided"}
          />

          <InfoItem
            label="Employee Login ID"
            value={
              employee.employeeLoginId ?? "Not created"
            }
            mono
          />

          <InfoItem
            label="Club Assignment"
            value={
              employee.clubName ?? "No club assigned"
            }
          />

          <InfoItem
            label="Role Level"
            value={employee.clubType ?? "â€”"}
          />
        </div>
      </div>

      <EmployeeActions
        employeeId={employee.id}
        role={employee.role}
        hasAccount={Boolean(employee.userId)}
        isActive={employee.user?.isActive ?? false}
        employeeLoginId={employee.employeeLoginId}
        clubName={employee.clubName}
        clubType={employee.clubType}
      />
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <p
        className={`mt-1 text-sm text-gray-900 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {label}
        </p>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function ManagementLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 p-5 transition hover:border-[#0f2a47] hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f2a47]/10 text-[#0f2a47] transition group-hover:bg-[#0f2a47] group-hover:text-white">
          <Icon size={19} />
        </div>

        <div>
          <h3 className="font-semibold text-gray-900">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-5 text-gray-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}




