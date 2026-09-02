import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { hashPassword } from "@/lib/password";

const EMPLOYEE_LOGIN_ROLES = ["LIBRARIAN", "HEALTH"] as const;

type EmployeeLoginRole = (typeof EMPLOYEE_LOGIN_ROLES)[number];

function makeLoginId(role: EmployeeLoginRole) {
  const prefix = role === "LIBRARIAN" ? "LIB" : "HLT";
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${prefix}-${suffix}`;
}

export async function POST(request: Request) {
  await requireRole(["ADMIN"]);

  const employees = await prisma.employee.findMany({
    where: {
      userId: null,
      role: {
        in: [...EMPLOYEE_LOGIN_ROLES],
      },
    },
  });

  const created: Array<{
    employeeId: string;
    userId: string;
    loginId: string;
    role: EmployeeLoginRole;
    fullName: string;
  }> = [];

  for (const employee of employees) {
    if (!EMPLOYEE_LOGIN_ROLES.includes(employee.role as EmployeeLoginRole)) {
      continue;
    }

    const role = employee.role as EmployeeLoginRole;

    try {
      let loginId = makeLoginId(role);

      // Make absolutely sure the employee login ID is unique.
      let attempts = 0;

      while (attempts < 10) {
        const existing = await prisma.employee.findUnique({
          where: {
            employeeLoginId: loginId,
          },
        });

        if (!existing) break;

        loginId = makeLoginId(role);
        attempts++;
      }

      const existingLogin = await prisma.employee.findUnique({
        where: {
          employeeLoginId: loginId,
        },
      });

      if (existingLogin) {
        throw new Error(`Could not generate unique login ID for ${employee.fullName}`);
      }

      const passwordHash = await hashPassword(loginId);

      const user = await prisma.user.create({
        data: {
          role,
          passwordHash,
          isActive: true,
        },
      });

      await prisma.employee.update({
        where: {
          id: employee.id,
        },
        data: {
          userId: user.id,
          employeeLoginId: loginId,
        },
      });

      created.push({
        employeeId: employee.id,
        userId: user.id,
        loginId,
        role,
        fullName: employee.fullName,
      });
    } catch (error) {
      console.error(
        `Failed to create employee account for ${employee.fullName}:`,
        error
      );
    }
  }

  return NextResponse.json({
    created,
    count: created.length,
  });
}

