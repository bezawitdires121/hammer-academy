import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CreateUsersButton from "./CreateUsersButton";

type AccountStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "NO_ACCOUNT";

type StaffCard = {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
  email: string | null;
  loginId: string | null;
  accountStatus: AccountStatus;
  clubName: string | null;
  clubType: string | null;
};

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    role?: string;
  }>;
}) {
  const params = await searchParams;

  const q = (params?.q || "").trim();
  const roleFilter = (params?.role || "").trim();

  const [teachers, employees, admins] =
    await Promise.all([
      prisma.teacher.findMany({
        include: {
          user: true,
        },
        where: q
          ? {
              OR: [
                {
                  fullName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  teacherLoginId: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  user: {
                    email: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : undefined,
        orderBy: {
          fullName: "asc",
        },
      }),

      prisma.employee.findMany({
        include: {
          user: true,
        },
        where: q
          ? {
              OR: [
                {
                  fullName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  employeeLoginId: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  clubName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  clubType: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  user: {
                    email: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : undefined,
        orderBy: {
          fullName: "asc",
        },
      }),

      prisma.admin.findMany({
        include: {
          user: true,
        },
        orderBy: {
          fullName: "asc",
        },
      }),
    ]);

  const cards: StaffCard[] = [
    ...teachers.map(
      (teacher): StaffCard => ({
        id: teacher.id,
        name: teacher.fullName,
        role: "TEACHER",
        photoUrl: teacher.photoUrl,
        email: teacher.user?.email ?? null,
        loginId: teacher.teacherLoginId,
        accountStatus: teacher.user
          ? teacher.user.isActive
            ? "ACTIVE"
            : "INACTIVE"
          : "NO_ACCOUNT",
        clubName: null,
        clubType: null,
      })
    ),

    ...employees.map(
      (employee): StaffCard => ({
        id: employee.id,
        name: employee.fullName,
        role: employee.role,
        photoUrl: employee.photoUrl,
        email: employee.user?.email ?? null,
        loginId: employee.employeeLoginId ?? null,
        accountStatus: employee.user
          ? employee.user.isActive
            ? "ACTIVE"
            : "INACTIVE"
          : "NO_ACCOUNT",
        clubName: employee.clubName ?? null,
        clubType: employee.clubType ?? null,
      })
    ),

    ...admins.map(
      (admin): StaffCard => ({
        id: admin.id,
        name: admin.fullName,
        role: "ADMIN",
        photoUrl: null,
        email: admin.user?.email ?? null,
        loginId: null,
        accountStatus: admin.user
          ? admin.user.isActive
            ? "ACTIVE"
            : "INACTIVE"
          : "NO_ACCOUNT",
        clubName: null,
        clubType: null,
      })
    ),
  ];

  const filteredCards =
    roleFilter && roleFilter !== "ALL"
      ? cards.filter(
          (card) => card.role === roleFilter
        )
      : cards;

  const teacherCount = cards.filter(
    (card) => card.role === "TEACHER"
  ).length;

  const employeeCount = cards.filter(
    (card) =>
      card.role !== "TEACHER" &&
      card.role !== "ADMIN"
  ).length;

  const adminCount = cards.filter(
    (card) => card.role === "ADMIN"
  ).length;

  const activeCount = cards.filter(
    (card) => card.accountStatus === "ACTIVE"
  ).length;

  const inactiveCount = cards.filter(
    (card) => card.accountStatus === "INACTIVE"
  ).length;

  function roleLabel(role: string) {
    return role
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function roleBadgeClass(role: string) {
    if (role === "TEACHER") {
      return "bg-blue-50 text-blue-700";
    }

    if (role === "ADMIN") {
      return "bg-red-50 text-red-700";
    }

    return "bg-green-50 text-green-700";
  }

  function accountStatusLabel(
    status: AccountStatus
  ) {
    if (status === "ACTIVE") {
      return "Active";
    }

    if (status === "INACTIVE") {
      return "Inactive";
    }

    return "No Account";
  }

  function accountStatusClass(
    status: AccountStatus
  ) {
    if (status === "ACTIVE") {
      return "bg-green-50 text-green-700";
    }

    if (status === "INACTIVE") {
      return "bg-red-50 text-red-700";
    }

    return "bg-gray-100 text-gray-600";
  }

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function getHref(card: StaffCard) {
    if (card.role === "TEACHER") {
      return `/dashboard/admin/teachers/${card.id}`;
    }

    if (card.role === "ADMIN") {
      return "/dashboard/admin";
    }

    return `/dashboard/admin/employees/${card.id}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0f2a47]">
            People / Employees
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Staff Directory
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            View and manage teachers, employees,
            and administrators in one organized
            directory.
          </p>
        </div>

        <div className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total Staff
            </p>

            <p className="mt-1 text-2xl font-bold text-[#0f2a47]">
              {cards.length}
            </p>
          </div>

          <CreateUsersButton />
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Teachers
          </p>

          <p className="mt-2 text-2xl font-bold text-[#0f2a47]">
            {teacherCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Other Employees
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {employeeCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Administrators
          </p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {adminCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Active Accounts
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Inactive Accounts
          </p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Find Staff
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Search by name, email, login ID, or
            club information.
          </p>
        </div>

        <form
          method="get"
          className="grid gap-3 md:grid-cols-[1fr_220px_auto]"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search staff..."
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
          />

          <select
            name="role"
            defaultValue={
              roleFilter || "ALL"
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f2a47]"
          >
            <option value="ALL">
              All Roles
            </option>

            <option value="TEACHER">
              Teachers
            </option>

            <option value="ADMIN">
              Administrators
            </option>

            <option value="CLEANER">
              Cleaners
            </option>

            <option value="SECURITY">
              Security
            </option>

            <option value="SECRETARY">
              Secretaries
            </option>

            <option value="LIBRARIAN">
              Librarians
            </option>

            <option value="HEALTH">
              Health Staff
            </option>

            <option value="OTHER">
              Other
            </option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[#0f2a47] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Search
            </button>

            {(q || roleFilter) && (
              <Link
                href="/dashboard/admin/employees"
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Directory */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              Staff Members
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredCards.length === 1
                ? "1 staff member found"
                : `${filteredCards.length} staff members found`}
            </p>
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              ?
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              No staff found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Try another search term or reset the
              filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCards.map((card) => (
              <Link
                key={`${card.role}-${card.id}`}
                href={getHref(card)}
                className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#0f2a47]/10">
                    {card.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.photoUrl}
                        alt={card.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#0f2a47]">
                        {getInitials(
                          card.name
                        )}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900">
                      {card.name}
                    </h3>

                    <div className="mt-1 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(
                          card.role
                        )}`}
                      >
                        {roleLabel(
                          card.role
                        )}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${accountStatusClass(
                          card.accountStatus
                        )}`}
                      >
                        {accountStatusLabel(
                          card.accountStatus
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
                  {card.email && (
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        Email
                      </span>

                      <span className="truncate text-gray-700">
                        {card.email}
                      </span>
                    </div>
                  )}

                  {card.loginId && (
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        Login ID
                      </span>

                      <span className="font-mono text-gray-700">
                        {card.loginId}
                      </span>
                    </div>
                  )}

                  {card.clubName && (
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        Club
                      </span>

                      <span className="truncate text-gray-700">
                        {card.clubName}
                      </span>
                    </div>
                  )}

                  {card.clubType && (
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        Type
                      </span>

                      <span className="truncate text-gray-700">
                        {card.clubType}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Staff profile
                  </span>

                  <span className="font-medium text-[#0f2a47] group-hover:underline">
                    View profile â†’
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

