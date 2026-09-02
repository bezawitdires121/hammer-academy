import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function GET(request: Request) {
  await requireRole(["ADMIN"]);

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");

  const where: any = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (from || to) {
    where.date = {};
  }

  if (from) {
    where.date.gte = new Date(from);
  }

  if (to) {
    where.date.lte = new Date(to);
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  const rows: string[] = [];

  rows.push(
    [
      "studentLoginId",
      "studentId",
      "date",
      "status",
      "reason",
      "recordedById",
    ].join(",")
  );

  for (const r of records) {
    const cols = [
      r.student.studentLoginId,
      r.studentId,
      r.date.toISOString(),
      r.status,
      r.reason || "",
      r.recordedById || "",
    ];

    const row = cols
      .map((v) =>
        String(v)
          .replace(/\n/g, " ")
          .replace(/,/g, "\\,")
      )
      .join(",");

    rows.push(row);
  }

  const csv = rows.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-export.csv"`,
    },
  });
}