
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import ShuffleManager from "./ShuffleManager";

export default async function AdminShufflePage() {
  await requireRole(["ADMIN"]);

  const [schoolYears, grades] = await Promise.all([
    prisma.schoolYear.findMany({
      orderBy: {
        startDate: "desc",
      },
      select: {
        id: true,
        label: true,
      },
    }),

    prisma.grade.findMany({
      orderBy: {
        level: "asc",
      },
      select: {
        id: true,
        level: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f2a47]">
          Section Shuffle
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Balance students across sections using academic performance,
          gender, and student numbers.
        </p>
      </div>

      <ShuffleManager
        schoolYears={schoolYears}
        grades={grades}

      />
    </div>
  );
}

