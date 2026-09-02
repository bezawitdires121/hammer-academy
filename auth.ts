import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        loginType: {},
        email: {},
        password: {},
        fullName: {},
        loginId: {},
      },

      authorize: async (credentials) => {
        const loginType =
          credentials?.loginType as string | undefined;

        if (!loginType) {
          return null;
        }

        const rateKey =
          loginType === "ADMIN"
            ? (credentials?.email as string)
            : (credentials?.loginId as string);

        if (!rateKey) {
          return null;
        }

        const allowed = await checkLoginRateLimit(rateKey);

        if (!allowed) {
          return null;
        }

        /*
         * ADMIN
         *
         * Admin continues to use:
         * Email + Password
         */
        if (loginType === "ADMIN") {
          const email = (
            credentials?.email as string | undefined
          )
            ?.trim()
            .toLowerCase();

          const password =
            credentials?.password as string | undefined;

          if (!email || !password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email,
            },
          });

          if (
            !user ||
            !user.isActive ||
            user.role !== "ADMIN"
          ) {
            return null;
          }

          /*
           * Admin password authentication remains unchanged.
           */
          const { verifyPassword } = await import(
            "@/lib/password"
          );

          const isValid = await verifyPassword(
            password,
            user.passwordHash
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            role: "ADMIN",
          };
        }

        /*
         * TEACHER
         *
         * Login:
         * Full Name + Teacher Login ID
         *
         * No password is requested.
         */
        if (loginType === "TEACHER") {
          const fullName = (
            credentials?.fullName as string | undefined
          )?.trim();

          const loginId = (
            credentials?.loginId as string | undefined
          )?.trim();

          if (!fullName || !loginId) {
            return null;
          }

          const teacher =
            await prisma.teacher.findUnique({
              where: {
                teacherLoginId: loginId,
              },
              include: {
                user: true,
              },
            });

          if (
            !teacher ||
            !teacher.user ||
            !teacher.user.isActive
          ) {
            return null;
          }

          if (
            teacher.fullName.toLowerCase() !==
            fullName.toLowerCase()
          ) {
            return null;
          }

          return {
            id: teacher.user.id,
            role: "TEACHER",
          };
        }

        /*
         * LIBRARIAN / HEALTH
         *
         * Login:
         * Full Name + Employee Login ID
         *
         * No password is requested.
         */
        if (
          loginType === "LIBRARIAN" ||
          loginType === "HEALTH"
        ) {
          const fullName = (
            credentials?.fullName as string | undefined
          )?.trim();

          const loginId = (
            credentials?.loginId as string | undefined
          )?.trim();

          if (!fullName || !loginId) {
            return null;
          }

          const employee =
            await prisma.employee.findUnique({
              where: {
                employeeLoginId: loginId,
              },
              include: {
                user: true,
              },
            });

          if (
            !employee ||
            !employee.user ||
            !employee.user.isActive
          ) {
            return null;
          }

          /*
           * Make sure the login type matches the
           * employee's actual role.
           */
          if (employee.role !== loginType) {
            return null;
          }

          /*
           * Make sure the User role also matches.
           */
          if (employee.user.role !== loginType) {
            return null;
          }

          /*
           * Full name must match.
           */
          if (
            employee.fullName.toLowerCase() !==
            fullName.toLowerCase()
          ) {
            return null;
          }

          return {
            id: employee.user.id,
            role: employee.user.role,
          };
        }

        /*
         * STUDENT
         *
         * Student continues to use:
         * Full Name + Student Login ID + Password
         */
        if (loginType === "STUDENT") {
          const fullName = (
            credentials?.fullName as string | undefined
          )?.trim();

          const loginId = (
            credentials?.loginId as string | undefined
          )?.trim();

          if (!fullName || !loginId) {
            return null;
          }

          const student =
            await prisma.student.findUnique({
              where: {
                studentLoginId: loginId,
              },
              include: {
                user: true,
              },
            });

          if (
            !student ||
            !student.user ||
            !student.user.isActive
          ) {
            return null;
          }

          if (
            student.fullName.toLowerCase() !==
            fullName.toLowerCase()
          ) {
            return null;
          }

          return {
            id: student.user.id,
            role: "STUDENT",
          };
        }
        return null;
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as
          | "ADMIN"
          | "TEACHER"
          | "STUDENT"
          | "LIBRARIAN"
          | "HEALTH";

        session.user.id = token.id as string;
      }

      return session;
    },
  },
});