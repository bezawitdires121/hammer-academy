import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

function parseCSVToObjects(text: string): {
  header: string[];
  rows: Record<string, string>[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { header: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());

    return values;
  };

  const header = parseLine(lines[0]).map((value) =>
    value.trim().replace(/^"|"$/g, "")
  );

  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};

    header.forEach((key, index) => {
      row[key] = (values[index] || "")
        .trim()
        .replace(/^"|"$/g, "");
    });

    return row;
  });

  return { header, rows };
}

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

  if (
    !header.includes("studentLoginId") ||
    !header.includes("sectionId")
  ) {
    return NextResponse.json(
      {
        error:
          "CSV must include studentLoginId and sectionId columns",
      },
      { status: 400 }
    );
  }

  const results: Array<{
    line: number;
    studentLoginId: string;
    sectionId: string;
    success: boolean;
    message?: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const lineNo = i + 2;
    const row = rows[i];

    const studentLoginId = (row["studentLoginId"] || "").trim();
    const sectionId = (row["sectionId"] || "").trim();

    if (!studentLoginId || !sectionId) {
      results.push({
        line: lineNo,
        studentLoginId,
        sectionId,
        success: false,
        message: "Missing studentLoginId or sectionId",
      });

      continue;
    }

    try {
      const student = await prisma.student.findUnique({
        where: { studentLoginId },
      });

      if (!student) {
        results.push({
          line: lineNo,
          studentLoginId,
          sectionId,
          success: false,
          message: "Student not found",
        });

        continue;
      }

      const section = await prisma.section.findUnique({
        where: { id: sectionId },
      });

      if (!section) {
        results.push({
          line: lineNo,
          studentLoginId,
          sectionId,
          success: false,
          message: "Section not found",
        });

        continue;
      }

      // Update student's current section
      await prisma.student.update({
        where: { id: student.id },
        data: {
          currentSectionId: sectionId,
        },
      });

      // Ensure enrollment exists for this school year
      const existingEnrollment =
        await prisma.studentEnrollment.findFirst({
          where: {
            studentId: student.id,
            schoolYearId: section.schoolYearId,
          },
        });

      if (!existingEnrollment) {
        await prisma.studentEnrollment.create({
          data: {
            studentId: student.id,
            schoolYearId: section.schoolYearId,
            sectionId,
            status: "ACTIVE",
          },
        });
      } else if (existingEnrollment.sectionId !== sectionId) {
        await prisma.studentEnrollment.update({
          where: {
            id: existingEnrollment.id,
          },
          data: {
            sectionId,
            status: "ACTIVE",
          },
        });
      }

      results.push({
        line: lineNo,
        studentLoginId,
        sectionId,
        success: true,
      });
    } catch (err: unknown) {
      results.push({
        line: lineNo,
        studentLoginId,
        sectionId,
        success: false,
        message:
          err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}