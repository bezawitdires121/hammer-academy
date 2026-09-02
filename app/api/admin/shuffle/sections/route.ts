import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireRole(["ADMIN"]);

    const { searchParams } =
      new URL(request.url);

    const schoolYearId =
      searchParams.get("schoolYearId") || "";

    const gradeId =
      searchParams.get("gradeId") || "";

    if (!schoolYearId || !gradeId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "School year and grade are required.",
          sections: [],
        },
        { status: 400 }
      );
    }

    const sections =
      await prisma.section.findMany({
        where: {
          schoolYearId,
          gradeId,
        },
        orderBy: {
          label: "asc",
        },
        select: {
          id: true,
          label: true,
          _count: {
            select: {
              enrollments: {
                where: {
                  status: "ACTIVE",
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      sections: sections.map(
        (section) => ({
          id: section.id,
          label: section.label,
          studentCount:
            section._count.enrollments,
        })
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load sections.",
        sections: [],
      },
      { status: 500 }
    );
  }
}
