"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sendTeacherMessage(teacherId: string, message: string) {
  const session = await auth();
  if (!session?.user?.id || !message.trim()) {
    return { error: "Invalid." };
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  });

  if (!student) {
    return { error: "Not a student." };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
  });

  if (!teacher) {
    return { error: "Teacher not found." };
  }

  const cleanMessage = message.trim();

  await prisma.studentTeacherMessage.create({
    data: {
      studentId: student.id,
      teacherId,
      senderRole: "STUDENT",
      message: cleanMessage,
    },
  });

  const studentEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      section: {
        schoolYear: {
          isCurrent: true,
        },
      },
    },
    select: {
      sectionId: true,
      section: {
        select: {
          schoolYearId: true,
        },
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: teacher.userId,
      channel: "IN_APP",
      status: "SENT",
      title: "New message from student",
      message: cleanMessage,
      sentAt: new Date(),
      sectionId: studentEnrollment?.sectionId,
      schoolYearId: studentEnrollment?.section.schoolYearId,
        semesterId: studentEnrollment?.section.schoolYearId
          ? (
              await prisma.semester.findFirst({
                where: {
                  schoolYearId: studentEnrollment.section.schoolYearId,
                  isCurrent: true,
                },
                select: {
                  id: true,
                },
              })
            )?.id
          : undefined,
    },
  });

  revalidatePath("/dashboard/student/messages");
  revalidatePath("/dashboard/teacher/messages");
  revalidatePath("/dashboard/notifications");

  return { ok: true };
}

export async function replyToStudent(studentId: string, message: string) {
  const session = await auth();
  if (!session?.user?.id || !message.trim()) {
    return { error: "Invalid." };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  });

  if (!teacher) {
    return { error: "Not a teacher." };
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    return { error: "Student not found." };
  }

  const cleanMessage = message.trim();

  await prisma.studentTeacherMessage.create({
    data: {
      studentId,
      teacherId: teacher.id,
      senderRole: "TEACHER",
      message: cleanMessage,
    },
  });

  const studentEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      section: {
        schoolYear: {
          isCurrent: true,
        },
      },
    },
    select: {
      sectionId: true,
      section: {
        select: {
          schoolYearId: true,
        },
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: student.userId,
      channel: "IN_APP",
      status: "SENT",
      title: "New message from teacher",
      message: cleanMessage,
      sentAt: new Date(),
      sectionId: studentEnrollment?.sectionId,
      schoolYearId: studentEnrollment?.section.schoolYearId,
        semesterId: studentEnrollment?.section.schoolYearId
          ? (
              await prisma.semester.findFirst({
                where: {
                  schoolYearId: studentEnrollment.section.schoolYearId,
                  isCurrent: true,
                },
                select: {
                  id: true,
                },
              })
            )?.id
          : undefined,
    },
  });

  revalidatePath("/dashboard/teacher/messages");
  revalidatePath("/dashboard/student/messages");
  revalidatePath("/dashboard/notifications");

  return { ok: true };
}


export async function markAdminMessageRead(
  messageId: string
): Promise<void> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return;
  }

  const message = await prisma.studentAdminMessage.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    return;
  }

  if (message.senderRole !== "STUDENT") {
    return;
  }

  await prisma.studentAdminMessage.update({
    where: {
      id: messageId,
    },
    data: {
      readAt: new Date(),
      handledById: session.user.id,
    },
  });

  revalidatePath("/dashboard/admin/messages");
  revalidatePath("/dashboard/notifications");
}
export async function replyToStudentAsAdmin(
  studentId: string,
  formData: FormData
): Promise<void> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return;
  }

  const message = String(formData.get("message") || "").trim();

  if (!message) {
    return;
  }

  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!student) {
    return;
  }

  await prisma.studentAdminMessage.create({
    data: {
      studentId: student.id,
      handledById: session.user.id,
      senderRole: "ADMIN",
      message,
    },
  });

  const studentEnrollment =
    await prisma.studentEnrollment.findFirst({
      where: {
        studentId: student.id,
        status: "ACTIVE",
        section: {
          schoolYear: {
            isCurrent: true,
          },
        },
      },
      select: {
        sectionId: true,
        section: {
          select: {
            schoolYearId: true,
          },
        },
      },
    });

  const currentSemester =
    studentEnrollment?.section.schoolYearId
      ? await prisma.semester.findFirst({
          where: {
            schoolYearId:
              studentEnrollment.section.schoolYearId,
            isCurrent: true,
          },
          select: {
            id: true,
          },
        })
      : null;

  await prisma.notification.create({
    data: {
      userId: student.userId,
      channel: "IN_APP",
      status: "SENT",
      title: "New message from admin",
      message,
      sentAt: new Date(),
      sectionId: studentEnrollment?.sectionId,
      schoolYearId:
        studentEnrollment?.section.schoolYearId,
      semesterId: currentSemester?.id,
    },
  });

  revalidatePath("/dashboard/admin/messages");
  revalidatePath("/dashboard/student/messages");
  revalidatePath("/dashboard/notifications");
}
export async function sendAdminMessage(message: string) {
  const session = await auth();
  if (!session?.user?.id || !message.trim()) {
    return { error: "Invalid." };
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  });

  if (!student) {
    return { error: "Not a student." };
  }

  const cleanMessage = message.trim();

  await prisma.studentAdminMessage.create({
    data: {
      studentId: student.id,
      senderRole: "STUDENT",
      message: cleanMessage,
    },
  });

  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    select: {
      id: true,
    },
  });

  const studentEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      section: {
        schoolYear: {
          isCurrent: true,
        },
      },
    },
    select: {
      sectionId: true,
      section: {
        select: {
          schoolYearId: true,
        },
      },
    },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        channel: "IN_APP",
        status: "SENT",
        title: "New message from student",
        message: cleanMessage,
        sentAt: new Date(),
        sectionId: studentEnrollment?.sectionId,
        schoolYearId: studentEnrollment?.section.schoolYearId,
        semesterId: studentEnrollment?.section.schoolYearId
          ? (
              await prisma.semester.findFirst({
                where: {
                  schoolYearId: studentEnrollment.section.schoolYearId,
                  isCurrent: true,
                },
                select: {
                  id: true,
                },
              })
            )?.id
          : undefined,
      },
    });
  }

  revalidatePath("/dashboard/student/messages");
  revalidatePath("/dashboard/admin/messages");
  revalidatePath("/dashboard/notifications");

  return { ok: true };
}





