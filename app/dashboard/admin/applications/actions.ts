"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateLoginId(prefix: string) {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = `${prefix}-`;

  for (let i = 0; i < 8; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return result;
}

async function createUniqueLoginId(prefix: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const loginId = generateLoginId(prefix);

    const existingTeacher =
      await prisma.teacher.findUnique({
        where: {
          teacherLoginId: loginId,
        },
      });

    if (existingTeacher) {
      continue;
    }

    const existingEmployee =
      await prisma.employee.findUnique({
        where: {
          employeeLoginId: loginId,
       },
      });

    if (existingEmployee) {
      continue;
    }

    return loginId;
  }

  throw new Error(
    "Could not generate a unique login ID."
  );
}

function getRolePrefix(role: string) {
  if (role === "TEACHER") return "TCH";
  if (role === "LIBRARIAN") return "LIB";
  if (role === "HEALTH") return "HLT";

  return null;
}

function isPortalEmployeeRole(
  role: string
): role is "LIBRARIAN" | "HEALTH" {
  return (
    role === "LIBRARIAN" ||
    role === "HEALTH"
  );
}

/*
 * ------------------------------------------------
 * ACCEPT APPLICATION
 * ------------------------------------------------
 */
export async function acceptApplication(
  formData: FormData
) {
  const admin = await requireRole(["ADMIN"]);

  const applicationId =
    formData.get("applicationId");

  if (
    typeof applicationId !== "string" ||
    !applicationId
  ) {
    return {
      error: "Application not found.",
    };
  }

  const application =
    await prisma.teacherApplication.findUnique({
      where: {
        id: applicationId,
      },
    });

  if (!application) {
    return {
      error: "Application not found.",
    };
  }

  if (application.status !== "PENDING") {
    return {
      error:
        "This application has already been reviewed.",
    };
  }

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: application.email,
      },
    });

  if (existingUser) {
    return {
      error:
        "An account with this email already exists.",
    };
  }

  /*
   * ------------------------------------------------
   * TEACHER
   * ------------------------------------------------
   */

  if (application.requestedRole === "TEACHER") {
    const teacherLoginId =
      await createUniqueLoginId("TCH");

    await prisma.$transaction(
      async (tx) => {
        const unusablePasswordHash =
          crypto.randomBytes(32).toString("hex");

        const user =
          await tx.user.create({
            data: {
              email: application.email,
              phone: application.phone,
              passwordHash:
                unusablePasswordHash,
              role: "TEACHER",
              isActive: true,

              teacherProfile: {
                create: {
                  fullName:
                    application.fullName,
                  photoUrl:
                    application.photoUrl,
                  teacherLoginId,
                },
              },
            },
          });

        await tx.teacherApplication.update({
          where: {
            id: applicationId,
          },
          data: {
            status: "ACCEPTED",
            reviewedAt: new Date(),
            reviewedById:
              admin.user.id,
          },
        });

        return user;
      }
    );

    await logAction(
      admin.user.id,
      "TEACHER_APPLICATION_ACCEPTED",
      "TeacherApplication",
      applicationId,
      {
        email: application.email,
        teacherLoginId,
      }
    );

    revalidatePath(
      "/dashboard/admin/applications"
    );

    revalidatePath("/dashboard/admin");

    return {
      success: true,
      employeeName:
        application.fullName,
      loginId: teacherLoginId,
      role: "TEACHER",
    };
  }

  /*
   * ------------------------------------------------
   * LIBRARIAN / HEALTH
   * ------------------------------------------------
   */

  if (
    isPortalEmployeeRole(
      application.requestedRole
    )
  ) {
    const prefix =
      getRolePrefix(
        application.requestedRole
      );

    if (!prefix) {
      return {
        error: "Invalid employee role.",
      };
    }

    const employeeLoginId =
      await createUniqueLoginId(prefix);

    const clubName =
      typeof formData.get("clubName") ===
      "string"
        ? (
            formData.get("clubName") as string
          ).trim()
        : null;

    await prisma.$transaction(
      async (tx) => {
        const unusablePasswordHash =
          crypto.randomBytes(32).toString("hex");

        /*
         * IMPORTANT:
         * User.role only receives roles that actually
         * exist in the User Prisma enum.
         */
        const user =
          await tx.user.create({
            data: {
              email: application.email,
              phone: application.phone,
              passwordHash:
                unusablePasswordHash,

              role:
                application.requestedRole ===
                "LIBRARIAN"
                  ? "LIBRARIAN"
                  : "HEALTH",

              isActive: true,
            },
          });

        await tx.employee.create({
          data: {
            fullName:
              application.fullName,

            role:
              application.requestedRole,

            photoUrl:
              application.photoUrl,

            clubName:
              clubName ||
              application.clubName ||
              null,

            clubType:
              application.clubType ||
              null,

            userId: user.id,

            employeeLoginId,
          },
        });

        await tx.teacherApplication.update({
          where: {
            id: applicationId,
          },
          data: {
            status: "ACCEPTED",
            reviewedAt: new Date(),
            reviewedById:
              admin.user.id,
          },
        });
      }
    );

    await logAction(
      admin.user.id,
      "EMPLOYEE_APPLICATION_ACCEPTED",
      "TeacherApplication",
      applicationId,
      {
        email: application.email,
        role:
          application.requestedRole,
        employeeLoginId,
      }
    );

    revalidatePath(
      "/dashboard/admin/applications"
    );

    revalidatePath("/dashboard/admin");

    revalidatePath(
      "/dashboard/employee"
    );

    revalidatePath(
      "/dashboard/employee/librarian"
    );

    revalidatePath(
      "/dashboard/employee/health"
    );

    return {
      success: true,
      employeeName:
        application.fullName,
      loginId: employeeLoginId,
      role:
        application.requestedRole,
    };
  }

  /*
   * ------------------------------------------------
   * OTHER EMPLOYEE ROLES
   * ------------------------------------------------
   *
   * These employees are created without a User
   * portal account.
   */

  const clubName =
    typeof formData.get("clubName") ===
    "string"
      ? (
          formData.get(
            "clubName"
          ) as string
        ).trim()
      : null;

  await prisma.$transaction(
    async (tx) => {
      await tx.employee.create({
        data: {
          fullName:
            application.fullName,

          role:
            application.requestedRole,

          photoUrl:
            application.photoUrl,

          clubName:
            clubName ||
            application.clubName ||
            null,

          clubType:
            application.clubType ||
            null,
        },
      });

      await tx.teacherApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: "ACCEPTED",
          reviewedAt: new Date(),
          reviewedById:
            admin.user.id,
        },
      });
    }
  );

  await logAction(
    admin.user.id,
    "EMPLOYEE_APPLICATION_ACCEPTED",
    "TeacherApplication",
    applicationId,
    {
      email: application.email,
      role:
        application.requestedRole,
    }
  );

  revalidatePath(
    "/dashboard/admin/applications"
  );

  revalidatePath("/dashboard/admin");

  revalidatePath(
    "/dashboard/admin/employees"
  );

  return {
    success: true,
    employeeName:
      application.fullName,
    role:
      application.requestedRole,
  };
}

/*
 * ------------------------------------------------
 * REJECT APPLICATION
 * ------------------------------------------------
 */
export async function rejectApplication(
  formData: FormData
) {
  const admin = await requireRole(["ADMIN"]);

  const applicationId =
    formData.get("applicationId");

  if (
    typeof applicationId !== "string" ||
    !applicationId
  ) {
    return {
      error: "Application not found.",
    };
  }

  const application =
    await prisma.teacherApplication.findUnique({
      where: {
        id: applicationId,
      },
    });

  if (!application) {
    return {
      error: "Application not found.",
    };
  }

  if (application.status !== "PENDING") {
    return {
      error:
        "This application has already been reviewed.",
    };
  }

  await prisma.teacherApplication.update({
    where: {
      id: applicationId,
    },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: admin.user.id,
    },
  });

  await logAction(
    admin.user.id,
    "APPLICATION_REJECTED",
    "TeacherApplication",
    applicationId,
    {
      email: application.email,
      role:
        application.requestedRole,
    }
  );

  revalidatePath(
    "/dashboard/admin/applications"
  );

  revalidatePath("/dashboard/admin");

  return {
    success: true,
  };
}