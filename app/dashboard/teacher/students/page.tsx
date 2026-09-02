import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import StudentBrowser from "./StudentBrowser";
import { buildClassNumberMap } from "@/lib/class-number";

export default async function TeacherStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!teacherProfile) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const selectedSchoolYearId =
    typeof params.schoolYearId === "string"
      ? params.schoolYearId
      : undefined;

  const currentSchoolYear = await prisma.schoolYear.findFirst({
    where: selectedSchoolYearId
      ? { id: selectedSchoolYearId }
      : { isCurrent: true },
    select: {
      id: true,
      label: true,
    },
  });

  if (!currentSchoolYear) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-800">
          No Current School Year
        </h1>
        <p className="mt-2 text-sm text-amber-700">
          No school year is currently marked as active. Please contact an
          administrator.
        </p>
      </div>
    );
  }

  /*
   * TEACHER VISIBILITY RULE
   *
   * A teacher can see ONLY students who:
   *
   * 1. Have an ACTIVE enrollment
   * 2. Are enrolled in the CURRENT school year
   * 3. Are enrolled in a section where this teacher is EITHER:
   *    a. The homeroom teacher, OR
   *    b. Assigned to teach at least one subject
   *
   * Historical enrollments are never used.
   * Students transferred to another section disappear from
   * the previous teacher's My Students automatically.
   */
  const students = await prisma.student.findMany({
    where: {
      enrollments: {
        some: {
          schoolYearId: currentSchoolYear.id,
          status: "ACTIVE",
          section: {
            OR: [
              { homeroomTeacherId: teacherProfile.id },
              {
                subjectAssignments: {
                  some: { teacherId: teacherProfile.id },
                },
              },
            ],
          },
        },
      },
    },

    include: {
      parentContacts: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },

      enrollments: {
        where: {
          schoolYearId: currentSchoolYear.id,
          status: "ACTIVE",
          section: {
            OR: [
              { homeroomTeacherId: teacherProfile.id },
              {
                subjectAssignments: {
                  some: { teacherId: teacherProfile.id },
                },
              },
            ],
          },
        },

        include: {
          section: {
            include: {
              grade: true,

              subjectAssignments: {
                where: {
                  teacherId: teacherProfile.id,
                },

                include: {
                  subject: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    orderBy: {
      fullName: "asc",
    },
  });

  // Build per-section class-number maps (1-based alphabetical position).
  const sectionRosterMap = new Map<string, { id: string; fullName: string }[]>();
  for (const student of students) {
    const sectionId = student.enrollments[0]?.section.id;
    if (!sectionId) continue;
    const list = sectionRosterMap.get(sectionId) ?? [];
    list.push({ id: student.id, fullName: student.fullName });
    sectionRosterMap.set(sectionId, list);
  }
  const classNumberMaps = new Map<string, Map<string, number>>();
  for (const [sectionId, roster] of sectionRosterMap) {
    classNumberMaps.set(sectionId, buildClassNumberMap(roster));
  }

  const formattedStudents = students
    .map((student) => {
      const enrollment = student.enrollments[0];

      if (!enrollment) {
        return null;
      }

      const section = enrollment.section;

      return {
        id: student.id,
        fullName: student.fullName,
        photoUrl: student.photoUrl,
        classNo: classNumberMaps.get(section.id)?.get(student.id) ?? 0,
        classId: section.id,
        className: `Grade ${section.grade.level}${section.label}`,
        grade: section.grade.level,
        isClassTeacher: section.homeroomTeacherId === teacherProfile.id,
        subjects: section.subjectAssignments.map(
          (assignment) => assignment.subject.name
        ),
        parents: student.parentContacts.map((parent) => ({
          id: parent.id,
          fullName: parent.fullName,
          phone: parent.phone,
          email: parent.email ?? "",
        })),
      };
    })
    .filter(
      (student): student is NonNullable<typeof student> => student !== null
    );

  const classMap = new Map<string, { id: string; name: string; grade: number }>();

  for (const student of formattedStudents) {
    if (!classMap.has(student.classId)) {
      classMap.set(student.classId, {
        id: student.classId,
        name: student.className,
        grade: student.grade,
      });
    }
  }

  const classes = Array.from(classMap.values()).sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-accent">Teaching</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-brand-primary">
            My Students
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            View the students currently enrolled in your assigned sections.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Students
          </p>
          <p className="mt-1 text-2xl font-black text-brand-primary">
            {formattedStudents.length}
          </p>
        </div>
      </div>

      {/* Browser */}
      <StudentBrowser students={formattedStudents} classes={classes} />
    </div>
  );
}
