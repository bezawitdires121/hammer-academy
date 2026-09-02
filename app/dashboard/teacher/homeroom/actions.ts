"use server";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { ethiopianToGregorian } from "@/lib/ethiopian-calendar";
import { AttendanceStatus } from "@prisma/client";

async function getHomeroomTeacher(sectionId: string) {
  const session = await requireTeacher();

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  });

  if (!teacher) throw new Error("Teacher profile not found.");

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
  });

  if (!section) throw new Error("Section not found.");

  if (section.homeroomTeacherId !== teacher.id) {
    throw new Error("You are not the homeroom teacher for this section.");
  }

  return { teacher, section };
}

// ¢€‚¬¢€‚¬ Attendance ¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬

export async function saveAttendance(formData: FormData) {
  const sectionId = formData.get("sectionId") as string;
  const dateStr = formData.get("date") as string;
  const semesterId = formData.get("semesterId") as string;
  const notes =
    (formData.get("notes") as string | null)?.trim() || null;

  if (!sectionId || !dateStr || !semesterId) {
    throw new Error("Missing sectionId, date, or semester.");
  }

  const { teacher, section } =
    await getHomeroomTeacher(sectionId);

  const date = new Date(`${dateStr}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  date.setUTCHours(0, 0, 0, 0);

  // The semester MUST belong to the same school year as the section.
  const semester = await prisma.semester.findFirst({
    where: {
      id: semesterId,
      schoolYearId: section.schoolYearId,
    },
    select: {
      id: true,
      name: true,
      number: true,
      startDate: true,
      endDate: true,
      isLocked: true,
    },
  });

  if (!semester) {
    throw new Error(
      "Invalid semester: it does not belong to this section's school year.",
    );
  }


  if (semester.isLocked) {
    throw new Error("This semester is locked. Attendance cannot be changed.");
  }

  // Use the exact same Ethiopian-calendar boundaries
  // used by the attendance page.
  const schoolYear = await prisma.schoolYear.findUnique({
    where: {
      id: section.schoolYearId,
    },
    select: {
      label: true,
    },
  });

  if (!schoolYear) {
    throw new Error("School year not found.");
  }

  const schoolYearEcYear = Number(
    schoolYear.label.match(/\d{4}/)?.[0],
  );

  if (!Number.isInteger(schoolYearEcYear)) {
    throw new Error("Invalid Ethiopian school year label.");
  }
  const attendanceDate = dateStr.slice(0, 10);

  const semesterStart = new Date(semester.startDate)
    .toISOString()
    .slice(0, 10);

  const semesterEnd = new Date(semester.endDate)
    .toISOString()
    .slice(0, 10);

  console.log("ATTENDANCE DATE CHECK:", {
    attendanceDate,
    semesterStart,
    semesterEnd,
    semesterName: semester.name,
    semesterId: semester.id,
    sectionSchoolYearId: section.schoolYearId,
  });

  if (
    attendanceDate < semesterStart ||
    attendanceDate > semesterEnd
  ) {
    throw new Error(
      `${semester.name} runs from ${semesterStart} through ${semesterEnd}. Please choose a date inside this semester.`,
    );
  }
  const validStatuses: AttendanceStatus[] = [
    "PRESENT",
    "ABSENT",
    "LATE",
    "PERMISSION_GIVEN",
  ];

  const submittedEntries: {
    studentId: string;
    status: AttendanceStatus;
    reason: string | null;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("attendance_")) continue;

    const studentId = key.replace("attendance_", "");
    const status = value as AttendanceStatus;

    if (!studentId || !validStatuses.includes(status)) {
      continue;
    }

    const reason =
      (formData.get(`reason_${studentId}`) as string | null)
        ?.trim() || null;

    submittedEntries.push({
      studentId,
      status,
      reason,
    });
  }

  if (submittedEntries.length === 0) {
    throw new Error("No attendance data submitted.");
  }

  // Only ACTIVE students enrolled in this exact section
  // and school year are allowed to receive attendance records.
  const activeEnrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        sectionId: section.id,
        schoolYearId: section.schoolYearId,
        status: "ACTIVE",
      },
      select: {
        studentId: true,
      },
    });

  const activeStudentIds = new Set(
    activeEnrollments.map(
      (enrollment) => enrollment.studentId,
    ),
  );

  // Never trust student IDs supplied by the browser.
  for (const entry of submittedEntries) {
    if (!activeStudentIds.has(entry.studentId)) {
      throw new Error(
        "One or more submitted students are not active in this section.",
      );
    }
  }

  const batch = await prisma.attendanceBatch.create({
    data: {
      createdById: teacher.userId,
      source: "HOMEROOM_ENTRY",
      notes,
    },
  });

  await prisma.$transaction(
    submittedEntries.map((entry) =>
      prisma.attendance.upsert({
        where: {
          studentId_semesterId_date: {
            studentId: entry.studentId,
            semesterId: semester.id,
            date,
          },
        },
        update: {
          sectionId: section.id,
          semesterId: semester.id,
          status: entry.status,
          reason: entry.reason,
          recordedById: teacher.id,
          attendanceBatchId: batch.id,
        },
        create: {
          studentId: entry.studentId,
          sectionId: section.id,
          semesterId: semester.id,
          date,
          status: entry.status,
          reason: entry.reason,
          recordedById: teacher.id,
          attendanceBatchId: batch.id,
        },
      }),
    ),
  );

  revalidatePath(
    `/dashboard/teacher/homeroom/${sectionId}`,
  );

  revalidatePath(
    `/dashboard/teacher/homeroom/${sectionId}/attendance`,
  );
}
// ¢€‚¬¢€‚¬ Section announcement ¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬¢€‚¬

export async function postSectionAnnouncement(formData: FormData) {
  const sectionId = formData.get("sectionId") as string;
  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!sectionId || !title || !body) {
    throw new Error("Missing fields.");
  }

  const { teacher, section } =
    await getHomeroomTeacher(sectionId);

  const semester = await prisma.semester.findFirst({
    where: {
      schoolYearId: section.schoolYearId,
      isCurrent: true,
    },
    select: {
      id: true,
    },
  });

  if (!semester) {
    throw new Error("Current semester not found for this school year.");
  }

  const currentSemester = await prisma.semester.findFirst({
    where: { schoolYearId: section.schoolYearId, isCurrent: true },
    select: { id: true, isLocked: true },
  });

  if (!currentSemester) return { success: false, error: "No current semester is configured." };
  if (currentSemester.isLocked) return { success: false, error: "This semester is locked. Announcements cannot be created." };

  await prisma.announcement.create({
    data: {
      title,
      body,
      scope: "SECTION",
      sectionId,
      schoolYearId: section.schoolYearId,
      semesterId: semester.id,
      createdById: teacher.userId,
    },
  });

  revalidatePath(
    `/dashboard/teacher/homeroom/${sectionId}`,
  );

  revalidatePath("/dashboard/announcements");
}


