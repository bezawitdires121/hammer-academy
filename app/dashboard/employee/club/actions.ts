"use server";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { ClubRole } from "@prisma/client";

async function getLeaderClub(clubId: string) {
  const session = await requireTeacher();

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacher) throw new Error("Teacher profile not found.");

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Club not found.");
  if (club.leaderId !== teacher.id)
    throw new Error("You are not the leader of this club.");

  return { teacher, club };
}

export async function addClubMember(formData: FormData) {
  const clubId = formData.get("clubId") as string;
  const studentId = formData.get("studentId") as string;

  if (!clubId || !studentId) throw new Error("Missing fields.");
  await getLeaderClub(clubId);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found.");

  await prisma.clubMembership.upsert({
    where: { clubId_studentId: { clubId, studentId } },
    update: {},
    create: { clubId, studentId, role: "MEMBER" },
  });

  revalidatePath("/dashboard/employee/club");
  revalidatePath("/dashboard/employee/club/members");
}

export async function removeClubMember(formData: FormData) {
  const clubId = formData.get("clubId") as string;
  const studentId = formData.get("studentId") as string;

  if (!clubId || !studentId) throw new Error("Missing fields.");
  await getLeaderClub(clubId);

  await prisma.clubMembership.deleteMany({ where: { clubId, studentId } });

  revalidatePath("/dashboard/employee/club");
  revalidatePath("/dashboard/employee/club/members");
}

export async function setMemberRole(formData: FormData) {
  const clubId = formData.get("clubId") as string;
  const studentId = formData.get("studentId") as string;
  const role = formData.get("role") as ClubRole;

  if (!clubId || !studentId || !role) throw new Error("Missing fields.");

  const validRoles: ClubRole[] = ["MEMBER", "ASSISTANT", "SECRETARY", "DEPUTY"];
  if (!validRoles.includes(role)) throw new Error("Invalid role.");

  await getLeaderClub(clubId);

  await prisma.clubMembership.update({
    where: { clubId_studentId: { clubId, studentId } },
    data: { role },
  });

  revalidatePath("/dashboard/employee/club");
  revalidatePath("/dashboard/employee/club/members");
}

export async function postClubAnnouncement(formData: FormData) {
  const clubId = formData.get("clubId") as string;
  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!clubId || !title || !body) throw new Error("Missing fields.");

  const { teacher, club } = await getLeaderClub(clubId);

  const schoolYear =
    club.schoolYearId
      ? await prisma.schoolYear.findUnique({
          where: { id: club.schoolYearId },
          select: { id: true },
        })
      : await prisma.schoolYear.findFirst({
          where: { isCurrent: true },
          select: { id: true },
        });

  if (!schoolYear) {
    throw new Error("Current school year not found.");
  }

  const semester = await prisma.semester.findFirst({
    where: {
      schoolYearId: schoolYear.id,
      isCurrent: true,
    },
    select: { id: true },
  });

  if (!semester) {
    throw new Error("Current semester not found.");
  }

  await prisma.announcement.create({
    data: {
      title,
      body,
      scope: "SCHOOL_WIDE", // clubs use school-wide scope; filtered by clubId on read
      schoolYearId: schoolYear.id,
      semesterId: semester.id,
      createdById: teacher.userId,
    },
  });

  revalidatePath("/dashboard/employee/club");
  revalidatePath("/dashboard/announcements");
}

