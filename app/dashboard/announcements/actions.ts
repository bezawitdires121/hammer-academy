"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { createAnnouncementSchema } from "@/lib/validations";
import { logAction } from "@/lib/audit";
import { notifyMultipleUsers } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function getAnnouncementAudienceOptions(schoolYearId: string) {
  const user = await requireRole(["ADMIN", "TEACHER"]);

  if (!schoolYearId) {
    return { subjects: [], grades: [], sections: [] };
  }

  const [subjects, grades, sections] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.grade.findMany({
      orderBy: { level: "asc" },
      select: {
        id: true,
        level: true,
      },
    }),

    prisma.section.findMany({
      where: {
        schoolYearId,
      },
      orderBy: [
        { grade: { level: "asc" } },
        { label: "asc" },
      ],
      select: {
        id: true,
        label: true,
        gradeId: true,
        grade: {
          select: {
            level: true,
          },
        },
      },
    }),
  ]);

  return {
    subjects,
    grades,
    sections,
  };
}
export async function createAnnouncement(formData: FormData) {
  const user = await requireRole(["ADMIN", "TEACHER"]);

  const scope = String(formData.get("scope") || "");
  const audience = String(formData.get("audience") || "ALL");

  const teacherTarget = String(formData.get("teacherTarget") || "");
  const teacherSubjectTarget = String(
    formData.get("teacherSubjectTarget") || "ALL"
  );
  const teacherGradeTarget = String(
    formData.get("teacherGradeTarget") || ""
  );

  const employeeTarget = String(
    formData.get("employeeTarget") || ""
  );

  const studentTarget = String(
    formData.get("studentTarget") || ""
  );
  const studentGradeTarget = String(
    formData.get("studentGradeTarget") || ""
  );
  const studentGradeFrom = String(
    formData.get("studentGradeFrom") || ""
  );
  const studentGradeTo = String(
    formData.get("studentGradeTo") || ""
  );

  const classId = String(formData.get("classId") || "");

  const validationGrade =
    scope === "GRADE" && studentTarget === "GRADE"
      ? Number(studentGradeTarget)
      : undefined;

  const parsed = createAnnouncementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    scope,
    schoolYearId: formData.get("schoolYearId"),
    semesterId: formData.get("semesterId"),
    classId:
      scope === "SECTION"
        ? classId || undefined
        : undefined,
    grade: validationGrade,
    priority: formData.get("priority") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let sectionId: string | null = null;
  let gradeId: string | null = null;

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: parsed.data.schoolYearId },
    select: { id: true },
  });

  if (!schoolYear) {
    return { error: "Selected school year was not found." };
  }

  const semester = await prisma.semester.findFirst({
    where: {
      id: parsed.data.semesterId,
      schoolYearId: parsed.data.schoolYearId,
    },
    select: {
      id: true,
      isLocked: true,
    },
  });

  if (!semester) {
    return {
      error:
        "Selected semester does not belong to the selected school year.",
    };
  }

  if (semester.isLocked) {
    return {
      error:
        "This semester is locked. Announcements cannot be changed.",
    };
  }

  /*
   * Teacher permissions:
   * Teachers can only create announcements for their own
   * current homeroom section.
   */
  if (user.user.role === "TEACHER") {
    if (scope !== "SECTION") {
      return {
        error:
          "Only homeroom teachers can post section announcements.",
      };
    }

    if (!classId) {
      return { error: "Please select your homeroom section." };
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.user.id },
      select: { id: true },
    });

    if (!teacher) {
      return { error: "Teacher profile not found." };
    }

    const homeroom = await prisma.section.findFirst({
      where: {
        id: classId,
        homeroomTeacherId: teacher.id,
        schoolYear: { isCurrent: true },
      },
      select: { id: true },
    });

    if (!homeroom) {
      return {
        error:
          "You can only send announcements to your current homeroom section.",
      };
    }

    sectionId = homeroom.id;
  }

  /*
   * ADMIN audience validation and announcement scope.
   */
  if (user.user.role === "ADMIN") {
    if (audience === "ALL") {
      // School-wide.
    } else if (audience === "TEACHERS") {
      if (
        !["ALL", "SUBJECT", "HOMEROOM"].includes(
          teacherTarget
        )
      ) {
        return { error: "Please select a valid teacher group." };
      }

      if (
        teacherTarget === "SUBJECT" &&
        teacherSubjectTarget !== "ALL"
      ) {
        const subject = await prisma.subject.findUnique({
          where: { id: teacherSubjectTarget },
          select: { id: true },
        });

        if (!subject) {
          return { error: "Selected subject was not found." };
        }
      }

      if (teacherTarget === "HOMEROOM") {
        if (teacherGradeTarget !== "") {
          const level = Number(teacherGradeTarget);

          if (!Number.isInteger(level)) {
            return { error: "Selected homeroom grade is invalid." };
          }

          const grade = await prisma.grade.findFirst({
            where: { level },
            select: { id: true },
          });

          if (!grade) {
            return { error: "Selected grade was not found." };
          }
        }
      }
    } else if (audience === "EMPLOYEES") {
      const validEmployeeRoles = [
        "LIBRARIAN",
        "HEALTH",
        "SECRETARY",
        "SECURITY",
        "CLEANER",
        "OTHER",
      ] as const;

      if (
        employeeTarget !== "ALL" &&
        !validEmployeeRoles.includes(
          employeeTarget as (typeof validEmployeeRoles)[number]
        )
      ) {
        return { error: "Please select a valid employee group." };
      }
    } else if (audience === "STUDENTS") {
      if (
        !["ALL", "GRADE", "SECTION", "GRADE_RANGE"].includes(
          studentTarget
        )
      ) {
        return { error: "Please select a valid student group." };
      }

      if (studentTarget === "GRADE") {
        const level = Number(studentGradeTarget);

        if (!Number.isInteger(level)) {
          return { error: "Please select a grade." };
        }

        const grade = await prisma.grade.findFirst({
          where: { level },
          select: { id: true },
        });

        if (!grade) {
          return { error: "Selected grade was not found." };
        }

        gradeId = grade.id;
      }

      if (studentTarget === "SECTION") {
        if (!classId) {
          return { error: "Please select a section." };
        }

        const section = await prisma.section.findFirst({
          where: {
            id: classId,
            schoolYearId: parsed.data.schoolYearId,
          },
          select: {
            id: true,
          },
        });

        if (!section) {
          return {
            error:
              "Selected section was not found in the selected school year.",
          };
        }

        sectionId = section.id;
      }

      if (studentTarget === "GRADE_RANGE") {
        const from = Number(studentGradeFrom);
        const to = Number(studentGradeTo);

        if (!Number.isInteger(from) || !Number.isInteger(to)) {
          return { error: "Please select both grades." };
        }

        if (from > to) {
          return {
            error:
              "The starting grade cannot be higher than the ending grade.",
          };
        }

        const grades = await prisma.grade.findMany({
          where: {
            level: {
              gte: from,
              lte: to,
            },
          },
          select: { id: true },
        });

        if (grades.length === 0) {
          return {
            error: "No grades were found in the selected range.",
          };
        }
      }
    } else {
      return { error: "Invalid announcement audience." };
    }
  }

  /*
   * Build the audience metadata stored with the announcement.
   */
  const audienceData =
    user.user.role === "TEACHER"
      ? {
          type: "TEACHER_SECTION",
          sectionId,
        }
      : audience === "ALL"
        ? {
            type: "ALL",
          }
        : audience === "TEACHERS"
          ? {
              type: "TEACHERS",
              teacherTarget,
              ...(teacherTarget === "SUBJECT" &&
              teacherSubjectTarget !== "ALL"
                ? { subjectId: teacherSubjectTarget }
                : {}),
              ...(teacherTarget === "HOMEROOM" &&
              teacherGradeTarget !== ""
                ? { gradeLevel: Number(teacherGradeTarget) }
                : {}),
            }
          : audience === "EMPLOYEES"
            ? {
                type: "EMPLOYEES",
                employeeRole: employeeTarget,
              }
            : {
                type: "STUDENTS",
                studentTarget,
                ...(studentTarget === "GRADE"
                  ? { gradeLevel: Number(studentGradeTarget) }
                  : {}),
                ...(studentTarget === "SECTION"
                  ? { sectionId }
                  : {}),
                ...(studentTarget === "GRADE_RANGE"
                  ? {
                      fromGradeLevel: Number(studentGradeFrom),
                      toGradeLevel: Number(studentGradeTo),
                    }
                  : {}),
              };

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      scope: parsed.data.scope,
      audience: audienceData,
      priority: parsed.data.priority,
      gradeId,
      sectionId,
      schoolYearId: parsed.data.schoolYearId,
      semesterId: parsed.data.semesterId,
      createdById: user.user.id,
    },
  });

  await logAction(
    user.user.id,
    "ANNOUNCEMENT_CREATED",
    "Announcement",
    announcement.id,
    {
      title: announcement.title,
      scope: announcement.scope,
      audience: audienceData,
    }
  );

  const recipientUserIds = new Set<string>();

  /*
   * ALL ACTIVE USERS
   */
  if (
    user.user.role === "ADMIN" &&
    audience === "ALL"
  ) {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const target of users) {
      recipientUserIds.add(target.id);
    }
  }

  /*
   * TEACHERS
   */
  if (
    user.user.role === "ADMIN" &&
    audience === "TEACHERS"
  ) {
    if (teacherTarget === "ALL") {
      const teachers = await prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          user: { isActive: true },
        },
        select: { userId: true },
      });

      for (const teacher of teachers) {
        recipientUserIds.add(teacher.userId);
      }
    }

    if (teacherTarget === "SUBJECT") {
      const teachers = await prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          user: { isActive: true },
          subjectAssignments: {
            some: {
              ...(teacherSubjectTarget !== "ALL"
                ? { subjectId: teacherSubjectTarget }
                : {}),
              section: {
                schoolYearId: parsed.data.schoolYearId,
              },
            },
          },
        },
        select: { userId: true },
      });

      for (const teacher of teachers) {
        recipientUserIds.add(teacher.userId);
      }
    }

    if (teacherTarget === "HOMEROOM") {
      const sections = await prisma.section.findMany({
        where: {
          schoolYearId: parsed.data.schoolYearId,
          ...(teacherGradeTarget !== ""
            ? {
                grade: {
                  level: Number(teacherGradeTarget),
                },
              }
            : {}),
          homeroomTeacher: {
            status: "ACTIVE",
            user: { isActive: true },
          },
        },
        select: {
          homeroomTeacher: {
            select: {
              userId: true,
            },
          },
        },
      });

      for (const section of sections) {
        if (section.homeroomTeacher) {
          recipientUserIds.add(
            section.homeroomTeacher.userId
          );
        }
      }
    }
  }

  /*
   * OTHER EMPLOYEES
   */
  if (
    user.user.role === "ADMIN" &&
    audience === "EMPLOYEES"
  ) {
    const employees = await prisma.employee.findMany({
      where: {
        ...(employeeTarget !== "ALL"
          ? {
              role: employeeTarget as
                | "CLEANER"
                | "SECURITY"
                | "SECRETARY"
                | "LIBRARIAN"
                | "HEALTH"
                | "OTHER",
            }
          : {}),
        user: {
          isActive: true,
        },
      },
      select: {
        userId: true,
      },
    });

    for (const employee of employees) {
      if (employee.userId) {
        recipientUserIds.add(employee.userId);
      }
    }
  }

  /*
   * STUDENTS
   */
  if (
    user.user.role === "ADMIN" &&
    audience === "STUDENTS"
  ) {
    const studentWhere =
      studentTarget === "ALL"
        ? {
            user: { isActive: true },
            enrollments: {
              some: {
                status: "ACTIVE" as const,
                section: {
                  schoolYearId: parsed.data.schoolYearId,
                },
              },
            },
          }
        : studentTarget === "GRADE"
          ? {
              user: { isActive: true },
              enrollments: {
                some: {
                  status: "ACTIVE" as const,
                  section: {
                    schoolYearId: parsed.data.schoolYearId,
                    grade: {
                      level: Number(studentGradeTarget),
                    },
                  },
                },
              },
            }
          : studentTarget === "SECTION"
            ? sectionId
              ? {
                  user: { isActive: true },
                  enrollments: {
                    some: {
                      status: "ACTIVE" as const,
                      sectionId,
                      section: {
                        schoolYearId: parsed.data.schoolYearId,
                      },
                    },
                  },
                }
              : {
                  user: { isActive: false },
                }
            : {
                user: { isActive: true },
                enrollments: {
                  some: {
                    status: "ACTIVE" as const,
                    section: {
                      schoolYearId: parsed.data.schoolYearId,
                      grade: {
                        level: {
                          gte: Number(studentGradeFrom),
                          lte: Number(studentGradeTo),
                        },
                      },
                    },
                  },
                },
              };

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: {
        userId: true,
      },
    });

    for (const student of students) {
      recipientUserIds.add(student.userId);
    }
  }

  const linkSuffix = "";
  const prefix = `${announcement.title}: `;
  const maxBodyLength =
    160 - prefix.length - linkSuffix.length;

  const bodyPreview =
    announcement.body.length > maxBodyLength
      ? announcement.body.slice(
          0,
          Math.max(maxBodyLength - 3, 0)
        ) + "..."
      : announcement.body;

  const recipientIds = Array.from(recipientUserIds).filter(
    (id) => id !== user.user.id
  );

  if (recipientIds.length > 0) {
    await notifyMultipleUsers(
      recipientIds,
      announcement.title,
      `${prefix}${bodyPreview}${linkSuffix}`,
      announcement.id,
      sectionId ?? undefined
    );
  }

  revalidatePath("/dashboard/announcements");

  return { success: true };
}
export async function updateAnnouncement(formData: FormData) {
  const user = await requireRole(["ADMIN", "TEACHER"]);

  const announcementId = String(
    formData.get("announcementId") || ""
  );

  const title = String(
    formData.get("title") || ""
  ).trim();

  const body = String(
    formData.get("body") || ""
  ).trim();

  const priority =
    formData.get("priority") === "on";

  if (!announcementId || !title || !body) {
    return {
      error: "Title and message are required.",
    };
  }

  const announcement =
    await prisma.announcement.findUnique({
      where: {
        id: announcementId,
      },
      select: {
        id: true,
        createdById: true,
          semesterId: true,
      },
    });

  if (!announcement) {
    return {
      error: "Announcement not found.",
    };
  }

  /*
   * Only the creator can edit an announcement.
   *
   * ADMIN:
   *   - Can edit announcements they created.
   *
   * HOMEROOM TEACHER:
   *   - Can edit announcements they created.
   *
   * Nobody can edit another user's announcement.
   */
  if (announcement.createdById !== user.user.id) {
    return {
      error: "You are not allowed to edit this announcement.",
    };
  }
  const announcementSemester = await prisma.semester.findUnique({
    where: {
      id: announcement.semesterId,
    },
    select: {
      isLocked: true,
    },
  });

  if (announcementSemester?.isLocked) {
    return {
      error: "This semester is locked. Announcements cannot be changed.",
    };
  }


  await prisma.announcement.update({
    where: {
      id: announcementId,
    },
    data: {
      title,
      body,
      priority,
    },
  });

  await logAction(
    user.user.id,
    "ANNOUNCEMENT_UPDATED",
    "Announcement",
    announcementId,
    {
      title,
      priority,
    }
  );

  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard/notifications");

  return {
    success: true,
  };
}





