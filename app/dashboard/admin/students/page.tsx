import Link from "next/link";
import BulkActions from "./BulkActions";
import { prisma } from "@/lib/prisma";
import { Search, UserPlus, Users, X } from "lucide-react";

type Props = {
  searchParams: Promise<{
    q?: string;
    schoolYearId?: string;
    gradeId?: string;
    sectionId?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function StudentsPage({ searchParams }: Props) {
  const params = await searchParams;

  const q = params.q?.trim() || "";
  const schoolYearId = params.schoolYearId || "";
  const gradeId = params.gradeId || "";
  const sectionId = params.sectionId || "";

  const page = Math.max(
    1,
    parseInt(params.page || "1", 10) || 1
  );

  const pageSize = Math.min(
    100,
    Math.max(5, parseInt(params.pageSize || "20", 10) || 20)
  );

  const [
    totalStudents,
    schoolYears,
    grades,
    sections,
  ] = await Promise.all([
    prisma.student.count(),

    prisma.schoolYear.findMany({
      orderBy: {
        startDate: "desc",
      },
    }),

    prisma.grade.findMany({
      orderBy: {
        level: "asc",
      },
    }),

    prisma.section.findMany({
      include: {
        grade: true,
        schoolYear: true,
      },
      orderBy: [
        {
          grade: {
            level: "asc",
          },
        },
        {
          label: "asc",
        },
      ],
    }),
  ]);

  const hasFilters = Boolean(
    q || schoolYearId || gradeId || sectionId
  );

  /*
   * IMPORTANT:
   *
   * A student's currentSectionId is NOT used for historical
   * searching.
   *
   * Historical school year / grade / section information lives
   * in StudentEnrollment -> Section -> Grade / SchoolYear.
   */

  const enrollmentFilter =
    schoolYearId || gradeId || sectionId
      ? {
          some: {
            ...(schoolYearId
              ? {
                  schoolYearId,
                }
              : {}),

            ...(sectionId
              ? {
                  sectionId,
                }
              : {}),

            ...(gradeId
              ? {
                  section: {
                    gradeId,
                  },
                }
              : {}),
          },
        }
      : undefined;

  const studentWhere = {
    ...(q
      ? {
          OR: [
            {
              fullName: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              studentLoginId: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(enrollmentFilter
      ? {
          enrollments: enrollmentFilter,
        }
      : {}),
  };

  const students = hasFilters
    ? await prisma.student.findMany({
        where: studentWhere,

        include: {
          enrollments: {
            include: {
              section: {
                include: {
                  grade: true,
                  schoolYear: true,
                },
              },
            },

            orderBy: {
              createdAt: "desc",
            },
          },

          parentContacts: true,
        },

        orderBy: {
          fullName: "asc",
        },

        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    : [];

  const totalMatches = hasFilters
    ? await prisma.student.count({
        where: studentWhere,
      })
    : 0;

  const totalPages = Math.max(
    1,
    Math.ceil(totalMatches / pageSize)
  );

  const baseQuery = new URLSearchParams();

  if (q) {
    baseQuery.set("q", q);
  }

  if (schoolYearId) {
    baseQuery.set("schoolYearId", schoolYearId);
  }

  if (gradeId) {
    baseQuery.set("gradeId", gradeId);
  }

  if (sectionId) {
    baseQuery.set("sectionId", sectionId);
  }

  baseQuery.set("pageSize", String(pageSize));

  const selectedSchoolYear = schoolYears.find(
    (year) => year.id === schoolYearId
  );

  const selectedGrade = grades.find(
    (grade) => grade.id === gradeId
  );

  const selectedSection = sections.find(
    (section) => section.id === sectionId
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>People</span>
            <span>/</span>
            <span className="text-gray-900">Students</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            Students
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Search, review, and manage student records.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/admin/students/enroll"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f2a47] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163b60]"
          >
            <UserPlus className="h-4 w-4" />
            Enroll Student
          </Link>

          <Link
            href="/dashboard/admin/students/import"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Import CSV
          </Link>

          <a
            href="/api/admin/students/export"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2a47]/10">
              <Users className="h-5 w-5 text-[#0f2a47]" />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total Students
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {totalStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Search Results
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {hasFilters ? students.length : "-"}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {hasFilters
              ? "Students matching your filters"
              : "Apply a filter or search to find students"}
          </p>
        </div>
      </div>

      {/* Search */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900">
            Find a Student
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Search by student name or ID, then narrow the results by school year,
            grade, or section.
          </p>
        </div>

        <form method="GET" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              name="q"
              defaultValue={q}
              placeholder="Search student name or student ID..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">

            <select
              name="schoolYearId"
              defaultValue={schoolYearId}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f2a47]"
            >
              <option value="">All School Years</option>

              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                  {year.isCurrent ? " - Current" : ""}
                </option>
              ))}
            </select>

            <select
              name="gradeId"
              defaultValue={gradeId}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f2a47]"
            >
              <option value="">All Grades</option>

              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  Grade {grade.level}
                </option>
              ))}
            </select>

            <select
              name="sectionId"
              defaultValue={sectionId}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f2a47]"
            >
              <option value="">All Sections</option>

              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Grade {section.grade.level} - {section.label} (
                  {section.schoolYear.label})
                </option>
              ))}
            </select>

          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0f2a47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#163b60]"
            >
              <Search className="h-4 w-4" />
              Search Students
            </button>

            {hasFilters && (
              <Link
                href="/dashboard/admin/students"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Reset
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">

          {q && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              Search: {q}
            </span>
          )}

          {selectedSchoolYear && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {selectedSchoolYear.label}
            </span>
          )}

          {selectedGrade && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              Grade {selectedGrade.level}
            </span>
          )}

          {selectedSection && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              Section {selectedSection.label}
            </span>
          )}

        </div>
      )}

      {/* Results */}
      {!hasFilters ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <Search className="h-5 w-5 text-gray-400" />
          </div>

          <h2 className="mt-4 text-sm font-semibold text-gray-900">
            Search for a student
          </h2>

          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Students are not displayed here by default. Use the search box or
            filters above to find the student you need.
          </p>
        </section>
      ) : students.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
          <h2 className="text-sm font-semibold text-gray-900">
            No students found
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Try changing your search or filters.
          </p>
        </section>
      ) : (
        <section>

          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Matching Students
              </h2>

              <p className="text-sm text-gray-500">
                Select a student to open their complete profile.
              </p>
            </div>
          </div>

          <BulkActions sections={sections} />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

            {students.map((student) => {

              /*
               * Pick the enrollment that actually matches the active
               * historical filters.
               *
               * This is the other half of the bug:
               * the query can find the correct historical enrollment,
               * but the card must also DISPLAY that enrollment.
               */

              const matchingEnrollment =
                student.enrollments.find((enrollment) => {

                  const matchesSchoolYear =
                    !schoolYearId ||
                    enrollment.schoolYearId === schoolYearId;

                  const matchesGrade =
                    !gradeId ||
                    enrollment.section.gradeId === gradeId;

                  const matchesSection =
                    !sectionId ||
                    enrollment.sectionId === sectionId;

                  return (
                    matchesSchoolYear &&
                    matchesGrade &&
                    matchesSection
                  );
                }) ??
                student.enrollments.find(
                  (enrollment) =>
                    enrollment.section.schoolYear.isCurrent
                ) ??
                student.enrollments[0];

              const section = matchingEnrollment?.section;

              return (
                <div
                  key={student.id}
                  className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f2a47]/30 hover:shadow-md"
                >

                  <div className="flex items-start justify-between">

                    <div className="flex items-center gap-4">

                      {student.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0f2a47]/10 text-lg font-bold text-[#0f2a47]">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">

                        <h3 className="truncate font-semibold text-gray-900 group-hover:text-[#0f2a47]">
                          {student.fullName}
                        </h3>

                        <p className="mt-0.5 font-mono text-xs text-gray-500">
                          {student.studentLoginId}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {section
                            ? `Grade ${section.grade.level} - ${section.label}`
                            : "No section assigned"}
                        </p>

                      </div>
                    </div>

                    <div className="ml-2">
                      <input
                        type="checkbox"
                        className="student-checkbox"
                        value={student.id}
                      />
                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">

                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        School Year
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-gray-700">
                        {section?.schoolYear.label ?? "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        Guardian
                      </p>

                      <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
                        {student.parentContacts[0]?.fullName || "Not added"}
                      </p>
                    </div>

                  </div>

                  <div className="mt-4 text-right">
                    <Link
                      href={`/dashboard/admin/students/${student.id}`}
                      className="text-sm font-medium text-[#0f2a47]"
                    >
                      View profile -&gt;
                    </Link>
                  </div>

                </div>
              );
            })}

          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">

            <div className="text-sm text-gray-600">
              Showing page {page} of {totalPages} - {totalMatches} matching
              {totalMatches !== 1 ? " students" : " student"}
            </div>

            <div className="flex items-center gap-2">

              <Link
                href={`/dashboard/admin/students?${baseQuery.toString()}&page=${Math.max(
                  1,
                  page - 1
                )}`}
                className={`rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                  page <= 1
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                Prev
              </Link>

              <Link
                href={`/dashboard/admin/students?${baseQuery.toString()}&page=${Math.min(
                  totalPages,
                  page + 1
                )}`}
                className={`rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                  page >= totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                Next
              </Link>

            </div>
          </div>

        </section>
      )}
    </div>
  );
}
