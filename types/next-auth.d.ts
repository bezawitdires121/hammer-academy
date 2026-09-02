import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "LIBRARIAN" | "HEALTH";
    name?: string | null;
    email?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "TEACHER" | "STUDENT" | "LIBRARIAN" | "HEALTH";
      name?: string | null;
      email?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "TEACHER" | "STUDENT" | "LIBRARIAN" | "HEALTH";
    name?: string | null;
    email?: string | null;
  }
}