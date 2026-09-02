import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function POST(request: Request) {
  await requireRole(["ADMIN"]);

  const body = await request.json();

  const {
    action,
    studentIds,
    sectionId,
  } = body as {
    action: string;
    studentIds: string[];
    sectionId?: string;
  };

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json(
      { error: "No students specified" },
      { status: 400 }
    );
  }

  if (action === "delete") {
    try {
      const result = await prisma.$transaction(async (tx) => {
        /*
         * ResultCard -> Result is already ON DELETE CASCADE.
         *
         * These three student relations are NOT cascading,
         * so they must be removed before Student.
         */
        await tx.studentEnrollment.deleteMany({
          where: {
            studentId: {
              in: studentIds,
            },
          },
        });

        await tx.sectionShuffleProposal.deleteMany({
          where: {
            studentId: {
              in: studentIds,
            },
          },
        });

        await tx.resultCard.deleteMany({
          where: {
            studentId: {
              in: studentIds,
            },
          },
        });

        /*
         * Student -> User is ON DELETE CASCADE.
         *
         * AuditLog is deliberately NOT deleted.
         * Its userId becomes NULL because the schema uses
         * ON DELETE SET NULL.
         *
         * Notifications are user-owned and are therefore
         * removed explicitly before the User is deleted.
         */
        const students = await tx.student.findMany({
          where: {
            id: {
              in: studentIds,
            },
          },
          select: {
            id: true,
            userId: true,
          },
        });

        const userIds = students.map((student) => student.userId);

        await tx.notification.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        const deleted = await tx.student.deleteMany({
          where: {
            id: {
              in: studentIds,
            },
          },
        });

        return {
          deletedCount: deleted.count,
        };
      });

      return NextResponse.json({
        message: `${result.deletedCount} student${result.deletedCount === 1 ? "" : "s"} permanently deleted`,
        errors: [],
      });
    } catch (err: unknown) {
      console.error("Bulk student deletion failed:", err);

      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : String(err),
        },
        { status: 500 }
      );
    }
  }

  if (action === "assign") {
    if (!sectionId) {
      return NextResponse.json(
        { error: "No section specified for assign" },
        { status: 400 }
      );
    }

    try {
      const section = await prisma.section.findUnique({
        where: {
          id: sectionId,
        },
        select: {
          id: true,
          schoolYearId: true,
        },
      });

      if (!section) {
        return NextResponse.json(
          { error: "Section not found" },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        for (const studentId of studentIds) {
          await tx.studentEnrollment.upsert({
            where: {
              studentId_schoolYearId: {
                studentId,
                schoolYearId: section.schoolYearId,
              },
            },
            create: {
              studentId,
              schoolYearId: section.schoolYearId,
              sectionId: section.id,
              status: "ACTIVE",
            },
            update: {
              sectionId: section.id,
              status: "ACTIVE",
            },
          });

          await tx.student.update({
            where: {
              id: studentId,
            },
            data: {
              currentSectionId: section.id,
            },
          });
        }
      });

      return NextResponse.json({
        message: `${studentIds.length} students updated`,
        errors: [],
      });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : String(err),
        },
        { status: 500 }
      );
    }
  }

  if (action === "setHomeroomTeacher") {
    const {
      teacherId,
    } = body as {
      teacherId?: string;
    };

    if (!sectionId || !teacherId) {
      return NextResponse.json(
        {
          error:
            "sectionId and teacherId are required",
        },
        { status: 400 }
      );
    }

    try {
      await prisma.section.update({
        where: {
          id: sectionId,
        },
        data: {
          homeroomTeacherId: teacherId,
        },
      });

      return NextResponse.json({
        message: "Homeroom teacher set",
      });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : String(err),
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Unknown action" },
    { status: 400 }
  );
}