import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type AppRole = "ADMIN" | "TEACHER" | "STUDENT" | "LIBRARIAN" | "HEALTH";

export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(
  allowedRoles: AppRole | AppRole[]
) {
  const session = await requireAuth();

  const allowed = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  if (!allowed.includes(session.user.role as AppRole)) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

export async function requireTeacher() {
  return requireRole("TEACHER");
}

export async function requireStudent() {
  return requireRole("STUDENT");
}