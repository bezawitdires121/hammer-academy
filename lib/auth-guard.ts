import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireRole(allowedRoles: string[]) {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError("Not logged in");
  }

  if (!allowedRoles.includes(session.user.role)) {
    throw new UnauthorizedError("Insufficient permissions");
  }

  return session.user;
}