import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';

export async function POST(request: Request) {
  const session = await requireRole(['ADMIN', 'TEACHER']);

  const body = await request.json();
  const { studentIds, format, date } = body as { studentIds: string[]; format?: string; date?: string };

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: 'No students specified' }, { status: 400 });
  }

  const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { enrollments: { include: { section: { include: { grade: true, schoolYear: true } }, schoolYear: true }, orderBy: { createdAt: 'desc' } }, parentContacts: true }, orderBy: { fullName: 'asc' } });

  // If teacher, ensure they only export their homeroom students
  if (session.user.role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });

    const sections = await prisma.section.findMany({ where: { homeroomTeacherId: teacher.id } });
    const allowed = new Set(sections.map((s) => s.id));
    for (const s of students) {
      if (!allowed.has(s.currentSectionId || '')) {
        return NextResponse.json({ error: 'You can only export students from your homeroom sections' }, { status: 403 });
      }
    }
  }

  const includeAttendance = format === 'attendance';
  const includeCertification = format === 'certification';

  const rows: string[] = [];
  const baseHeaders = ['fullName', 'studentLoginId', 'sectionId', 'sectionLabel', 'schoolYear', 'parentFullName', 'parentPhone', 'parentEmail'];
  if (includeAttendance) baseHeaders.push('attendanceStatus');
  if (includeCertification) baseHeaders.push('certified');
  rows.push(baseHeaders.join(','));

  for (const s of students) {
    const enrollment = s.enrollments[0];
    const sectionId = enrollment?.section?.id || '';
    const sectionLabel = enrollment?.section?.label || '';
    const schoolYear = enrollment?.schoolYear?.label || '';
    const parent = s.parentContacts[0];
    const parentFullName = parent?.fullName || '';
    const parentPhone = parent?.phone || '';
    const parentEmail = parent?.email || '';

    let attendanceStatus = '';
    if (includeAttendance) {
      const targetDate = date ? new Date(date) : new Date();
      // normalize to start of day
      targetDate.setHours(0, 0, 0, 0);
      const att = await prisma.attendance.findFirst({ where: { studentId: s.id, date: targetDate } });
      attendanceStatus = att?.status || '';
    }

    const certified = includeCertification ? 'false' : '';

    const cols = [s.fullName, s.studentLoginId, sectionId, sectionLabel, schoolYear, parentFullName, parentPhone, parentEmail];
    if (includeAttendance) cols.push(attendanceStatus);
    if (includeCertification) cols.push(certified);

    const row = cols.map((v) => String(v).replace(/\n/g, ' ').replace(/,/g, '\,')).join(',');
    rows.push(row);
  }

  const csv = rows.join('\n');

  return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="students-selected.csv"` } });
}
