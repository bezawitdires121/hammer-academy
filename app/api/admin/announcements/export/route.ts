import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const session = await requireRole(["ADMIN"]);

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: any = {};
  if (scope) where.scope = scope;
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(from as string);
  if (to) where.createdAt.lte = new Date(to as string);

  const announcements = await prisma.announcement.findMany({ where, orderBy: { createdAt: "desc" } });

  const rows: string[] = [];
  rows.push(["id", "title", "body", "scope", "gradeId", "sectionId", "scheduledFor", "createdById", "createdAt"].join(","));

  for (const a of announcements) {
    const cols = [a.id, a.title, a.body, a.scope, a.gradeId || "", a.sectionId || "", a.scheduledFor ? a.scheduledFor.toISOString() : "", a.createdById, a.createdAt.toISOString()];
    const row = cols.map((v) => String(v).replace(/\n/g, " ").replace(/,/g, "\\,")).join(",");
    rows.push(row);
  }

  const csv = rows.join("\n");
  return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="announcements.csv"` } });
}
