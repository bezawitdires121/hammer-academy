"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateLoginId(prefix: string) {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LUA-${prefix}-${random}`;
}

function isLoginEnabledEmployeeRole(
  role: string
): role is "TEACHER" | "LIBRARIAN" | "HEALTH" {
  return (
    role === "TEACHER" ||
    role === "LIBRARIAN" ||
    role === "HEALTH"
  );
}

function getEmployeeLoginPrefix(
  role: "TEACHER" | "LIBRARIAN" | "HEALTH"
) {
  if (role === "TEACHER") return "TCH";
  if (role === "LIBRARIAN") return "LIB";
  return "HLT";
}

export async function createEmployeeAccount(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  const employeeId = formData.get("employeeId");

  if (typeof employeeId !== "string" || !employeeId) {
    return { error: "Missing employee id." };
  }

  const employee = await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },
  });

  if (!employee) {
    return {
      error: "Employee not found.",
    };
  }

  if (employee.userId) {
    return {
      error: "This employee already has an account.",
    };
  }

  /*
   * Login accounts are currently enabled for:
   *
   * TEACHER
   * LIBRARIAN
   * HEALTH
   *
   * Club assignment is NOT a role.
   */
  if (!isLoginEnabledEmployeeRole(employee.role)) {
    return {
      error:
        "This employee role does not currently have a login account.",
    };
  }

  const prefix = getEmployeeLoginPrefix(employee.role);
  const loginId = generateLoginId(prefix);

  /*
   * User.passwordHash is required by the database.
   *
   * Teacher/Librarian/Health do NOT authenticate with a password.
   * We therefore store an unusable random hash only to satisfy
   * the existing database requirement.
   */
  const passwordHash = await hashPassword(
    crypto.randomBytes(32).toString("hex")
  );

  const user = await prisma.user.create({
    data: {
      role: employee.role,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.employee.update({
    where: {
      id: employeeId,
    },
    data: {
      userId: user.id,
      employeeLoginId: loginId,
    },
  });

  await logAction(
    admin.user.id,
    "EMPLOYEE_ACCOUNT_CREATED",
    "Employee",
    employeeId,
    {
      role: employee.role,
      loginId,
    }
  );

  revalidatePath("/dashboard/admin/employees");
  revalidatePath(`/dashboard/admin/employees/${employeeId}`);

  return {
    success: true,
    loginId,
  };
}

export async function regenerateEmployeeLoginId(
  formData: FormData
) {
  const admin = await requireRole(["ADMIN"]);

  const employeeId = formData.get("employeeId");
  const reason = formData.get("reason");

  if (typeof employeeId !== "string" || !employeeId) {
    return {
      error: "Missing employee id.",
    };
  }

  const employee = await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },
  });

  if (!employee || !employee.userId) {
    return {
      error: "This employee has no account yet.",
    };
  }

  if (!isLoginEnabledEmployeeRole(employee.role)) {
    return {
      error:
        "This employee role does not currently have a login account.",
    };
  }

  const prefix = getEmployeeLoginPrefix(employee.role);
  const newLoginId = generateLoginId(prefix);

  await prisma.employee.update({
    where: {
      id: employeeId,
    },
    data: {
      employeeLoginId: newLoginId,
    },
  });

  await logAction(
    admin.user.id,
    "EMPLOYEE_LOGIN_ID_REGENERATED",
    "Employee",
    employeeId,
    {
      reason:
        typeof reason === "string"
          ? reason
          : "OTHER",
      newLoginId,
    }
  );

  revalidatePath(
    `/dashboard/admin/employees/${employeeId}`
  );
  revalidatePath("/dashboard/admin/employees");

  return {
    success: true,
    loginId: newLoginId,
  };
}

export async function toggleEmployeeActive(
  formData: FormData
) {
  const admin = await requireRole(["ADMIN"]);

  const employeeId = formData.get("employeeId");
  const isActive =
    formData.get("isActive") === "true";

  if (typeof employeeId !== "string" || !employeeId) {
    return {
      error: "Missing employee id.",
    };
  }

  const employee = await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },
  });

  if (!employee || !employee.userId) {
    return {
      error: "This employee has no account yet.",
    };
  }

  await prisma.user.update({
    where: {
      id: employee.userId,
    },
    data: {
      isActive,
    },
  });

  await logAction(
    admin.user.id,
    isActive
      ? "EMPLOYEE_REACTIVATED"
      : "EMPLOYEE_DEACTIVATED",
    "Employee",
    employeeId,
    {}
  );

  revalidatePath("/dashboard/admin/employees");
  revalidatePath(
    `/dashboard/admin/employees/${employeeId}`
  );

  return {
    success: true,
  };
}

export async function updateEmployee(
  formData: FormData
) {
  const admin = await requireRole(["ADMIN"]);

  const id = formData.get("employeeId");
  const role = formData.get("role");
  const clubName = formData.get("clubName");
  const clubType = formData.get("clubType");

  if (typeof id !== "string" || !id) {
    return {
      error: "Missing employee id.",
    };
  }

  const validRoles = [
    "TEACHER",
    "CLEANER",
    "SECURITY",
    "SECRETARY",
    "LIBRARIAN",
    "HEALTH",
    "OTHER",
  ] as const;

  const newRole =
    typeof role === "string" &&
    validRoles.includes(
      role as (typeof validRoles)[number]
    )
      ? (role as (typeof validRoles)[number])
      : undefined;

  const existingEmployee =
    await prisma.employee.findUnique({
      where: {
        id,
      },
    });

  if (!existingEmployee) {
    return {
      error: "Employee not found.",
    };
  }

  /*
   * Do not allow an authenticated employee account
   * to be changed into a role that has no login support.
   */
  if (
    newRole &&
    existingEmployee.userId &&
    !isLoginEnabledEmployeeRole(newRole)
  ) {
    return {
      error:
        "Employees with login accounts must remain Teacher, Librarian, or Health.",
    };
  }

  await prisma.employee.update({
    where: {
      id,
    },
    data: {
      role: newRole,

      clubName:
        typeof clubName === "string" &&
        clubName.trim() !== ""
          ? clubName.trim()
          : null,

      clubType:
        typeof clubType === "string" &&
        clubType.trim() !== ""
          ? clubType.trim()
          : null,
    },
  });

  await logAction(
    admin.user.id,
    "EMPLOYEE_UPDATED",
    "Employee",
    id,
    {}
  );

  revalidatePath(
    "/dashboard/admin/employees"
  );

  revalidatePath(
    `/dashboard/admin/employees/${id}`
  );

  return {
    success: true,
  };
}