import { requireStudent } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ClipboardCheck } from "lucide-react";
import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import Link from "next/link";

type Props = {
  searchParams: Promise<{
    schoolYearId?: string;
    semesterId?: string;
  }>;
};

export default async function StudentResultsPage({
  searchParams,
}: Props) {
  const session = await requireStudent();
  const params = await searchParams;

  const student = await prisma.student.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!student) return null;

  const schoolYears = await prisma.schoolYear.findMany({
  orderBy: {
    startDate: "desc",
  },
  select: {
    id: true,
    label: true,
  },
});

const currentSchoolYear = await prisma.schoolYear.findFirst({
  where: {
    isCurrent: true,
  },
  select: {
    id: true,
    label: true,
  },
});

  if (schoolYears.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Results
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your published exam results.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">
            No school years available
          </h2>
        </div>
      </div>
    );
  }

  const selectedSchoolYear =
  schoolYears.find((year) => year.id === params.schoolYearId) ??
  currentSchoolYear ??
  schoolYears[0];
  const semesters = await prisma.semester.findMany({
    where: {
      schoolYearId: selectedSchoolYear.id,
    },
    orderBy: {
      number: "asc",
    },
    select: {
      id: true,
      name: true,
      number: true,
    },
  });

  const selectedSemester =
    semesters.find(
      (semester) => semester.id === params.semesterId
    ) ??
    semesters.find((semester) => semester.number === 1) ??
    semesters[0] ??
    null;

  const resultCards = selectedSemester
    ? await prisma.resultCard.findMany({
        where: {
          studentId: student.id,
          status: "PUBLISHED",
          exam: {
            semesterId: selectedSemester.id,
            semester: {
              schoolYearId: selectedSchoolYear.id,
            },
          },
        },
        include: {
          exam: {
            include: {
              semester: true,
            },
          },
          results: {
            include: {
              subject: true,
            },
            orderBy: {
              subject: {
                name: "asc",
              },
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
      })
    : [];

  const buildUrl = (
    schoolYearId: string,
    semesterId?: string
  ) => {
    const query = new URLSearchParams();

    query.set("schoolYearId", schoolYearId);

    if (semesterId) {
      query.set("semesterId", semesterId);
    }

    return `/dashboard/student/results?${query.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My Results
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Your published exam results.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              School Year
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {schoolYears.map((year) => (
                <Link
                  key={year.id}
                  href={buildUrl(year.id)}
                  className={
                    selectedSchoolYear.id === year.id
                      ? "rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white"
                      : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  }
                >
                  {year.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Semester
            </p>

            {semesters.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {semesters.map((semester) => (
                  <Link
                    key={semester.id}
                    href={buildUrl(
                      selectedSchoolYear.id,
                      semester.id
                    )}
                    className={
                      selectedSemester?.id === semester.id
                        ? "rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white"
                        : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    }
                  >
                    {semester.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No semesters configured.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Showing results for{" "}
          <span className="font-bold text-slate-900">
            {selectedSchoolYear.label}
          </span>
          {selectedSemester && (
            <>
              {" / "}
              <span className="font-bold text-slate-900">
                {selectedSemester.name}
              </span>
            </>
          )}
        </div>
      </section>

      {resultCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-semibold text-slate-900">
            No results for this period
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            There are no published results for{" "}
            {selectedSchoolYear.label}
            {selectedSemester
              ? ` ? ${selectedSemester.name}`
              : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {resultCards.map((card) => {
            const total = card.results.reduce(
              (sum, result) => sum + result.marksObtained,
              0
            );

            const max = card.results.reduce(
              (sum, result) => sum + result.maxMarks,
              0
            );

            const pct =
              max > 0
                ? Math.round((total / max) * 100)
                : 0;

            return (
              <div
                key={card.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {card.exam.name}
                    </h2>

                    <p className="mt-0.5 text-sm text-slate-500">
                      {card.exam.semester.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Released:{" "}
                      {card.publishedAt
                        ? formatEthiopianDisplay(
                            card.publishedAt
                          )
                        : "?"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      {pct}%
                    </span>

                    
                  </div>
                </div>

                <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {card.results.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-slate-700">
                        {result.subject.name}
                      </span>

                      <span className="font-bold text-slate-900">
                        {result.marksObtained} /{" "}
                        {result.maxMarks}

                        {result.grade && (
                          <span className="ml-2 rounded bg-brand-primary/10 px-1.5 py-0.5 text-xs text-brand-primary">
                            {result.grade}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {card.remarks && (
                  <p className="mt-3 text-sm text-slate-500">
                    Remarks: {card.remarks}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
