"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { parseEthiopianDate } from "@/lib/ethiopian-calendar";
import { revalidatePath } from "next/cache";
import { TeacherStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────

export async function setTeacherStatus(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const teacherId = (formData.get("teacherId") as string | null)?.trim();
  const status = formData.get("status") as TeacherStatus;
  const reason = (formData.get("reason") as string | null)?.trim() || null;

  if (!teacherId || !status) {
    throw new Error("Missing fields");
  }

  const validStatuses: TeacherStatus[] = [
    "ACTIVE",
    "INACTIVE",
    "LOCKED",
  ];

  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found");
  }

  await prisma.$transaction([
    prisma.teacher.update({
      where: { id: teacherId },
      data: { status },
    }),

    prisma.user.update({
      where: { id: teacher.userId },
      data: {
        isActive: status === "ACTIVE",
      },
    }),

    prisma.teacherStatusHistory.create({
      data: {
        teacherId,
        status,
        changedById: admin.user.id,
        reason,
      },
    }),
  ]);

  await logAction(
    admin.user.id,
    "TEACHER_STATUS_CHANGED",
    "Teacher",
    teacherId,
    {
      status,
      reason,
    }
  );

  revalidatePath(`/dashboard/admin/teachers/${teacherId}`);
  revalidatePath("/dashboard/admin/teachers");
}

// ─────────────────────────────────────────────────────────────
// Homeroom
// ─────────────────────────────────────────────────────────────

export async function assignHomeroom(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const teacherId = (formData.get("teacherId") as string | null)?.trim();
  const sectionId =
    (formData.get("sectionId") as string | null)?.trim() || null;

  if (!teacherId) {
    throw new Error("Missing teacherId");
  }

  if (sectionId) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        homeroomTeacherId: true,
      },
    });

    if (!section) {
      throw new Error("Section not found");
    }

    if (
      section.homeroomTeacherId &&
      section.homeroomTeacherId !== teacherId
    ) {
      throw new Error(
        "This section already has a homeroom teacher. Remove them first."
      );
    }

    await prisma.section.update({
      where: { id: sectionId },
      data: {
        homeroomTeacherId: teacherId,
      },
    });
  } else {
    await prisma.section.updateMany({
      where: {
        homeroomTeacherId: teacherId,
      },
      data: {
        homeroomTeacherId: null,
      },
    });
  }

  await logAction(
    admin.user.id,
    sectionId ? "HOMEROOM_ASSIGNED" : "HOMEROOM_REMOVED",
    "Teacher",
    teacherId,
    {
      sectionId,
    }
  );

  revalidatePath(`/dashboard/admin/teachers/${teacherId}`);
  revalidatePath("/dashboard/admin/sections");
}

export async function removeHomeroom(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const teacherId = (formData.get("teacherId") as string | null)?.trim();

  if (!sectionId) {
    throw new Error("Missing sectionId");
  }

  await prisma.section.update({
    where: { id: sectionId },
    data: {
      homeroomTeacherId: null,
    },
  });

  await logAction(
    admin.user.id,
    "HOMEROOM_REMOVED",
    "Teacher",
    teacherId ?? "",
    {
      sectionId,
    }
  );

  if (teacherId) {
    revalidatePath(`/dashboard/admin/teachers/${teacherId}`);
  }

  revalidatePath("/dashboard/admin/sections");
}

// ─────────────────────────────────────────────────────────────
// Club
// ─────────────────────────────────────────────────────────────

export async function assignClub(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const teacherId = (formData.get("teacherId") as string | null)?.trim();
  const clubId =
    (formData.get("clubId") as string | null)?.trim() || null;

  if (!teacherId) {
    throw new Error("Missing teacherId");
  }

  await prisma.club.updateMany({
    where: {
      leaderId: teacherId,
    },
    data: {
      leaderId: null,
    },
  });

  if (clubId) {
    await prisma.club.update({
      where: { id: clubId },
      data: {
        leaderId: teacherId,
      },
    });
  }

  await logAction(
    admin.user.id,
    clubId ? "CLUB_LEADER_ASSIGNED" : "CLUB_LEADER_REMOVED",
    "Teacher",
    teacherId,
    {
      clubId,
    }
  );

  revalidatePath(`/dashboard/admin/teachers/${teacherId}`);
}

// ─────────────────────────────────────────────────────────────
// Subject assignment
//
// Rules:
//
// • Start Date is required.
// • Start Date is Ethiopian Calendar YYYY-MM-DD.
// • First assignment has no End Date.
// • An active assignment cannot be replaced.
// • Current teacher must first be ended.
// • New Start Date must be >= previous End Date.
// • Gaps are allowed.
// • End Date cannot be before Start Date.
// ─────────────────────────────────────────────────────────────

export async function addSubjectAssignment(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const teacherId =
    (formData.get("teacherId") as string | null)?.trim();

  const sectionId =
    (formData.get("sectionId") as string | null)?.trim();

  const subjectId =
    (formData.get("subjectId") as string | null)?.trim();

  const startDateValue =
    (formData.get("startDate") as string | null)?.trim();

  if (
    !teacherId ||
    !sectionId ||
    !subjectId ||
    !startDateValue
  ) {
    throw new Error("Missing fields");
  }

  // Convert Ethiopian Calendar date to Gregorian Date.
  const startDate = parseEthiopianDate(startDateValue);

  if (!startDate || Number.isNaN(startDate.getTime())) {
    throw new Error(
      "Invalid Ethiopian Start Date. Use YYYY-MM-DD."
    );
  }

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
    throw new Error("Section not found");
  }

  const subject = await prisma.subject.findUnique({
    where: {
      id: subjectId,
    },
    select: {
      id: true,
    },
  });

  if (!subject) {
    throw new Error("Subject not found");
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      id: teacherId,
    },
    select: {
      id: true,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found");
  }

  const existing = await prisma.teacherAssignment.findUnique({
    where: {
      sectionId_subjectId: {
        sectionId,
        subjectId,
      },
    },
    select: {
      id: true,
      teacherId: true,
    },
  });

  // ─────────────────────────────────────────────
  // No current assignment
  // ─────────────────────────────────────────────

  if (!existing) {
    await prisma.$transaction(async (tx) => {
      await tx.teacherAssignment.create({
        data: {
          teacherId,
          sectionId,
          subjectId,
        },
      });

      await tx.teacherAssignmentHistory.create({
        data: {
          teacherId,
          sectionId,
          subjectId,
          schoolYearId: section.schoolYearId,
          assignedById: admin.user.id,

          startDate,
          endDate: null,

          assignedAt: startDate,
          endedAt: null,
        },
      });
    });

    await logAction(
      admin.user.id,
      "SUBJECT_ASSIGNED",
      "TeacherAssignment",
      teacherId,
      {
        sectionId,
        subjectId,
        startDate: startDate.toISOString(),
        reassigned: false,
      }
    );

    revalidatePath(`/dashboard/admin/teachers/${teacherId}`);
    revalidatePath("/dashboard/admin/sections");

    return;
  }

  // ─────────────────────────────────────────────
  // Same teacher already owns it
  // ─────────────────────────────────────────────

  if (existing.teacherId === teacherId) {
    throw new Error(
      "This teacher is already assigned to this subject in this section."
    );
  }

  // ─────────────────────────────────────────────
  // Another teacher currently owns it.
  //
  // The assignment can only be replaced if the
  // CURRENT assignment has already been ended.
  // ─────────────────────────────────────────────

  const activeHistory =
    await prisma.teacherAssignmentHistory.findFirst({
      where: {
        teacherId: existing.teacherId,
        sectionId,
        subjectId,
        schoolYearId: section.schoolYearId,
        endedAt: null,
      },
      orderBy: {
        assignedAt: "desc",
      },
      select: {
        id: true,
        assignedAt: true,
        startDate: true,
        endedAt: true,
        endDate: true,
      },
    });

  // An active history record means the previous teacher
  // has NOT been ended yet.
  if (activeHistory) {
    throw new Error(
      "Another teacher is already assigned to this subject and section. End that teacher's assignment first by setting an End Date."
    );
  }

  // ─────────────────────────────────────────────
  // Find the most recent COMPLETED assignment.
  // ─────────────────────────────────────────────

  const previousHistory =
    await prisma.teacherAssignmentHistory.findFirst({
      where: {
        teacherId: existing.teacherId,
        sectionId,
        subjectId,
        schoolYearId: section.schoolYearId,
        OR: [
          {
            endedAt: {
              not: null,
            },
          },
          {
            endDate: {
              not: null,
            },
          },
        ],
      },
      orderBy: [
        {
          endedAt: "desc",
        },
        {
          endDate: "desc",
        },
        {
          assignedAt: "desc",
        },
      ],
      select: {
        id: true,
        assignedAt: true,
        startDate: true,
        endedAt: true,
        endDate: true,
      },
    });

  // This protects against an inconsistent database.
  if (!previousHistory) {
    throw new Error(
      "The previous teacher has no completed assignment history. Please fix the assignment history before replacing this teacher."
    );
  }

  const previousEndDate =
    previousHistory.endedAt ??
    previousHistory.endDate;

  if (!previousEndDate) {
    throw new Error(
      "The previous teacher's assignment does not have an End Date. Please set an End Date before assigning a new teacher."
    );
  }

  // New teacher cannot start before previous teacher ended.
  if (startDate < previousEndDate) {
    throw new Error(
      "The new teacher's Start Date cannot be before the previous teacher's End Date."
    );
  }

  // ─────────────────────────────────────────────
  // Replace current assignment.
  // ─────────────────────────────────────────────

  await prisma.$transaction(async (tx) => {
    await tx.teacherAssignment.delete({
      where: {
        id: existing.id,
      },
    });

    await tx.teacherAssignment.create({
      data: {
        teacherId,
        sectionId,
        subjectId,
      },
    });

    await tx.teacherAssignmentHistory.create({
      data: {
        teacherId,
        sectionId,
        subjectId,
        schoolYearId: section.schoolYearId,
        assignedById: admin.user.id,

        startDate,
        endDate: null,

        assignedAt: startDate,
        endedAt: null,
      },
    });
  });

  await logAction(
    admin.user.id,
    "SUBJECT_ASSIGNED",
    "TeacherAssignment",
    teacherId,
    {
      sectionId,
      subjectId,
      startDate: startDate.toISOString(),
      reassigned: true,
      previousTeacherId: existing.teacherId,
      previousTeacherEndDate: previousEndDate.toISOString(),
    }
  );

  revalidatePath(`/dashboard/admin/teachers/${teacherId}`);
  revalidatePath(`/dashboard/admin/teachers/${existing.teacherId}`);
  revalidatePath("/dashboard/admin/sections");
}

// ─────────────────────────────────────────────────────────────
// End subject assignment
// ─────────────────────────────────────────────────────────────

export async function endSubjectAssignment(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const assignmentId =
    (formData.get("assignmentId") as string | null)?.trim();

  const teacherId =
    (formData.get("teacherId") as string | null)?.trim();

  const endDateValue =
    (formData.get("endDate") as string | null)?.trim();

  if (!assignmentId || !teacherId || !endDateValue) {
    throw new Error("Missing fields");
  }

  // Ethiopian Calendar -> Gregorian.
  const endDate = parseEthiopianDate(endDateValue);

  if (!endDate || Number.isNaN(endDate.getTime())) {
    throw new Error(
      "Invalid Ethiopian End Date. Use YYYY-MM-DD."
    );
  }

  const assignment = await prisma.teacherAssignment.findUnique({
    where: {
      id: assignmentId,
    },
    select: {
      id: true,
      teacherId: true,
      sectionId: true,
      subjectId: true,
      section: {
        select: {
          schoolYearId: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new Error("Teacher assignment not found");
  }

  if (assignment.teacherId !== teacherId) {
    throw new Error(
      "This assignment does not belong to this teacher."
    );
  }

  const history =
    await prisma.teacherAssignmentHistory.findFirst({
      where: {
        teacherId: assignment.teacherId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,
        schoolYearId: assignment.section.schoolYearId,
        endedAt: null,
      },
      orderBy: {
        assignedAt: "desc",
      },
      select: {
        id: true,
        assignedAt: true,
        startDate: true,
        endedAt: true,
        endDate: true,
      },
    });

  if (!history) {
    throw new Error(
      "No active assignment history record was found."
    );
  }

  const assignmentStartDate =
    history.startDate ?? history.assignedAt;

  if (endDate < assignmentStartDate) {
    throw new Error(
      "End Date cannot be before the assignment Start Date."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacherAssignment.delete({
      where: {
        id: assignmentId,
      },
    });

    await tx.teacherAssignmentHistory.update({
      where: {
        id: history.id,
      },
      data: {
        endDate,
        endedAt: endDate,
        endReason: "Assignment ended by administrator",
      },
    });
  });

  await logAction(
    admin.user.id,
    "SUBJECT_UNASSIGNED",
    "TeacherAssignment",
    assignmentId,
    {
      teacherId,
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
      endDate: endDate.toISOString(),
    }
  );

  revalidatePath(`/dashboard/admin/teachers/${teacherId}`);
  revalidatePath("/dashboard/admin/sections");
}

// ─────────────────────────────────────────────────────────────
// Remove subject assignment
//
// Existing Remove button.
// Uses today's Gregorian date as the end date.
// ─────────────────────────────────────────────────────────────

export async function removeSubjectAssignment(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const assignmentId =
    (formData.get("assignmentId") as string | null)?.trim();

  const teacherId =
    (formData.get("teacherId") as string | null)?.trim();

  if (!assignmentId) {
    throw new Error("Missing assignmentId");
  }

  const assignment = await prisma.teacherAssignment.findUnique({
    where: {
      id: assignmentId,
    },
    select: {
      id: true,
      teacherId: true,
      sectionId: true,
      subjectId: true,
      section: {
        select: {
          schoolYearId: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new Error("Teacher assignment not found");
  }

  const history =
    await prisma.teacherAssignmentHistory.findFirst({
      where: {
        teacherId: assignment.teacherId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,
        schoolYearId: assignment.section.schoolYearId,
        endedAt: null,
      },
      orderBy: {
        assignedAt: "desc",
      },
      select: {
        id: true,
        assignedAt: true,
        startDate: true,
        endedAt: true,
        endDate: true,
      },
    });

  if (!history) {
    throw new Error(
      "No active assignment history record was found."
    );
  }

  const endDate = new Date();

  const assignmentStartDate =
    history.startDate ?? history.assignedAt;

  if (endDate < assignmentStartDate) {
    throw new Error(
      "The assignment start date is in the future. Choose an appropriate End Date instead."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacherAssignment.delete({
      where: {
        id: assignmentId,
      },
    });

    await tx.teacherAssignmentHistory.update({
      where: {
        id: history.id,
      },
      data: {
        endDate,
        endedAt: endDate,
        endReason: "Assignment removed",
      },
    });
  });

  await logAction(
    admin.user.id,
    "SUBJECT_UNASSIGNED",
    "TeacherAssignment",
    assignmentId,
    {
      teacherId: teacherId ?? assignment.teacherId,
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
      endDate: endDate.toISOString(),
    }
  );

  revalidatePath(
    `/dashboard/admin/teachers/${teacherId ?? assignment.teacherId}`
  );

  revalidatePath("/dashboard/admin/sections");
}
