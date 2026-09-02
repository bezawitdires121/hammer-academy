import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const session = await requireRole(["ADMIN", "TEACHER"]);

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const dateParam = url.searchParams.get("date");
  // If teacher requests, limit export to their homeroom sections. Accept optional sectionId.
  let students;
  const sectionIdParam = url.searchParams.get("sectionId");

  if (session.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    const teacherId = teacher?.id;
    if (!teacherId) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const sections = await prisma.section.findMany({ where: { homeroomTeacherId: teacherId } });
    const sectionIds = sections.map((s) => s.id);

    if (sectionIdParam) {
      if (!sectionIds.includes(sectionIdParam)) {
        return NextResponse.json({ error: 'You can only export your homeroom sections' }, { status: 403 });
      }
      students = await prisma.student.findMany({ where: { currentSectionId: sectionIdParam }, include: { enrollments: { include: { section: { include: { grade: true, schoolYear: true } }, schoolYear: true }, orderBy: { createdAt: "desc" } }, parentContacts: true }, orderBy: { fullName: "asc" } });
    } else {
      students = await prisma.student.findMany({
        where: { currentSectionId: { in: sectionIds } },
        include: {
          enrollments: { include: { section: { include: { grade: true, schoolYear: true } }, schoolYear: true }, orderBy: { createdAt: "desc" } },
          parentContacts: true,
        },
        orderBy: { fullName: "asc" },
      });
    }
  } else {
    // Admin: allow optional teacherId or sectionId filter
    const teacherIdParam = url.searchParams.get("teacherId");
    if (sectionIdParam) {
      students = await prisma.student.findMany({ where: { currentSectionId: sectionIdParam }, include: { enrollments: { include: { section: { include: { grade: true, schoolYear: true } }, schoolYear: true }, orderBy: { createdAt: "desc" } }, parentContacts: true }, orderBy: { fullName: "asc" } });
    } else if (teacherIdParam) {
      const sections = await prisma.section.findMany({ where: { homeroomTeacherId: teacherIdParam } });
      const sectionIds = sections.map((s) => s.id);
      students = await prisma.student.findMany({ where: { currentSectionId: { in: sectionIds } }, include: { enrollments: { include: { section: { include: { grade: true, schoolYear: true } }, schoolYear: true }, orderBy: { createdAt: "desc" } }, parentContacts: true }, orderBy: { fullName: "asc" } });
    } else {
      students = await prisma.student.findMany({
        include: {
          enrollments: { include: { section: { include: { grade: true, schoolYear: true } }, schoolYear: true }, orderBy: { createdAt: "desc" } },
          parentContacts: true,
        },
        orderBy: { fullName: "asc" },
      });
    }
  }

  const includeAttendance = format === 'attendance';
  const includeCertification = format === 'certification';

  const rows: string[] = [];
  const baseHeaders = ["fullName", "studentLoginId", "sectionId", "sectionLabel", "schoolYear", "parentFullName", "parentPhone", "parentEmail"];
  if (includeAttendance) baseHeaders.push('attendanceStatus');
  if (includeCertification) baseHeaders.push('certified');
  rows.push(baseHeaders.join(","));

  for (const s of students) {
    const enrollment = s.enrollments[0];
    const sectionId = enrollment?.section?.id || "";
    const sectionLabel = enrollment?.section?.label || "";
    const schoolYear = enrollment?.schoolYear?.label || "";
    const parent = s.parentContacts[0];
    const parentFullName = parent?.fullName || "";
    const parentPhone = parent?.phone || "";
    const parentEmail = parent?.email || "";

    let attendanceStatus = '';
    if (includeAttendance) {
      const targetDate = dateParam ? new Date(dateParam) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      const att = await prisma.attendance.findFirst({ where: { studentId: s.id, date: targetDate } });
      attendanceStatus = att?.status || '';
    }

    const certified = includeCertification ? 'false' : '';

    const cols = [s.fullName, s.studentLoginId, sectionId, sectionLabel, schoolYear, parentFullName, parentPhone, parentEmail];
    if (includeAttendance) cols.push(attendanceStatus);
    if (includeCertification) cols.push(certified);

    const row = cols.map((v) => String(v).replace(/\n/g, " ").replace(/,/g, "\\,") ).join(",");
    rows.push(row);
  }

  const csv = rows.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students.csv"`,
    },
  });
}
