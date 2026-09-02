import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { hashPassword } from "@/lib/password";
import { createStudentSchema } from "@/lib/validations";
import { parseCSVToObjects } from "@/lib/csv";

export async function POST(request: Request) {
  await requireRole(["ADMIN"]);

  const form = await request.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file uploaded." },
      { status: 400 }
    );
  }

  const text = await file.text();
  const { header, rows } = parseCSVToObjects(text);

  if (!header || header.length === 0) {
    return NextResponse.json(
      { error: "Empty CSV" },
      { status: 400 }
    );
  }

  const idx = (name: string) => header.indexOf(name);

  const requiredCols = [
    "fullName",
    "studentLoginId",
    "sectionId",
  ];

  for (const column of requiredCols) {
    if (idx(column) === -1) {
      return NextResponse.json(
        { error: `Missing column: ${column}` },
        { status: 400 }
      );
    }
  }

  const imported: Array<{
    line: number;
    studentId: string;
    studentLoginId: string;
  }> = [];

  const errors: Array<{
    line: number;
    row: string;
    error: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const lineNo = i + 2;
    const row = rows[i];

    const fullName = (row["fullName"] || "").trim();
    const studentLoginId =
      (row["studentLoginId"] || "").trim();
    const sectionId =
      (row["sectionId"] || "").trim();

    const parentFullName =
      row["parentFullName"] || undefined;

    const parentPhone =
      row["parentPhone"] || undefined;

    const parentEmail =
      row["parentEmail"] || undefined;

    const parsed = createStudentSchema.safeParse({
      fullName,
      sectionId,
      parentFullName,
      parentPhone,
      parentEmail,
    });

    if (!parsed.success) {
      errors.push({
        line: lineNo,
        row: JSON.stringify(row),
        error: parsed.error.issues[0].message,
      });
      continue;
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
        throw new Error(
          `Section ${sectionId} was not found.`
        );
      }

      if (!section.schoolYearId) {
        throw new Error(
          `Section ${sectionId} has no school year.`
        );
      }

      const existing =
        await prisma.student.findUnique({
          where: {
            studentLoginId,
          },
        });

      if (existing) {
        errors.push({
          line: lineNo,
          row: JSON.stringify(row),
          error: `studentLoginId ${studentLoginId} already exists`,
        });
        continue;
      }

      const passwordHash =
        await hashPassword(studentLoginId);

      const result =
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              passwordHash,
              role: "STUDENT",
            },
          });

          const student =
            await tx.student.create({
              data: {
                userId: user.id,
                fullName: parsed.data.fullName,
                studentLoginId,
                currentSectionId: section.id,
                gender: "MALE",
                age: 18,
                dateOfBirth: new Date("2008-01-01"),
              },
            });

          await tx.studentEnrollment.create({
            data: {
              studentId: student.id,
              schoolYearId: section.schoolYearId,
              sectionId: section.id,
              status: "ACTIVE",
            },
          });

          if (
            parsed.data.parentFullName ||
            parsed.data.parentPhone ||
            parsed.data.parentEmail
          ) {
            await tx.studentParentContact.create({
              data: {
                studentId: student.id,
                fullName:
                  parsed.data.parentFullName || "",
                phone:
                  parsed.data.parentPhone || null,
                email:
                  parsed.data.parentEmail || null,
                relationship: "Guardian",
              },
            });
          }

          return student;
        });

      imported.push({
        line: lineNo,
        studentId: result.id,
        studentLoginId,
      });
    } catch (err: unknown) {
      errors.push({
        line: lineNo,
        row: JSON.stringify(row),
        error:
          err instanceof Error
            ? err.message
            : String(err),
      });
    }
  }

  return NextResponse.json({
    importedCount: imported.length,
    imported,
    errors,
  });
}
