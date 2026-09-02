import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import SectionForm from "./SectionForm";
import SectionRow from "./SectionRow";
import ShuffleManager from "../shuffle/ShuffleManager";

export default async function AdminSectionsPage() {
  await requireRole(["ADMIN"]);

  const [grades, schoolYears, sections] = await Promise.all([
    prisma.grade.findMany({
      orderBy: {
        level: "asc",
      },
    }),

    prisma.schoolYear.findMany({
      orderBy: {
        startDate: "desc",
      },
    }),

    prisma.section.findMany({
      include: {
        grade: true,
        schoolYear: true,
      },
      orderBy: [
        {
          schoolYear: {
            startDate: "desc",
          },
        },
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f2a47]">
          Sections
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage grade sections, view students, and organize students between
          sections using the academic shuffle.
        </p>
      </div>

      {/* Create Section */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[#0f2a47]">
            Create Section
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add a section to a grade for a specific school year.
          </p>
        </div>

        <SectionForm
          grades={grades.map((g) => ({
            id: g.id,
            level: g.level,
          }))}
          schoolYears={schoolYears.map((y) => ({
            id: y.id,
            label: y.label,
          }))}
        />
      </section>

      {/* Existing Sections */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[#0f2a47]">
            Existing Sections
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            View and manage the sections created for each school year.
          </p>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="font-medium text-gray-700">
              No sections have been created yet.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Create your first section above.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sections.map((section) => (
              <SectionRow
                key={section.id}
                section={section}
                grades={grades}
                schoolYears={schoolYears}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Section Shuffle */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2a47] text-white">
              ⇄
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#0f2a47]">
                Shuffle Students Between Sections
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Select a school year and grade to redistribute its students
                across that grade&apos;s sections.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white bg-white p-2 shadow-sm">
          <ShuffleManager
            schoolYears={schoolYears.map((y) => ({
              id: y.id,
              label: y.label,
            }))}
            grades={grades.map((g) => ({
              id: g.id,
              level: g.level,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
