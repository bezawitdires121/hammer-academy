import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../lib/password";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@levelupacademy.edu";
  const plainPassword = "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists, skipping.");
  } else {
    const passwordHash = await hashPassword(plainPassword);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        adminProfile: { create: { fullName: "School Administrator" } },
      },
    });
    console.log("Admin created:", user.email);
    console.log("Temporary password:", plainPassword);
    console.log("IMPORTANT: change this after first login.");
  }

  // A starting School Year, since almost everything else depends on one existing
  const currentYear = await prisma.schoolYear.findFirst({ where: { isCurrent: true } });
  if (!currentYear) {
    await prisma.schoolYear.create({
      data: {
        label: "2018",
        startDate: new Date("2025-09-01"),
        endDate: new Date("2026-07-10"),
        isCurrent: true,
      },
    });
    console.log("School year 2018 created and marked current.");
  } else {
    console.log("A current school year already exists, skipping.");
  }

  // A basic subject list to seed, since results/homework need at least one
  const subjectNames = ["Mathematics", "English", "Science", "Social Studies", "Amharic"];
  for (const name of subjectNames) {
    await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Subjects seeded.");

  // --- Test accounts for quick login testing ---
  // Test Teacher
  const testTeacherLogin = "TCH-TEST1";
  const existingTeacher = await prisma.teacher.findUnique({ where: { teacherLoginId: testTeacherLogin } });
  if (!existingTeacher) {
    const teacherPassHash = await hashPassword(testTeacherLogin);
    const user = await prisma.user.create({ data: { email: null, passwordHash: teacherPassHash, role: "TEACHER" } });
    await prisma.teacher.create({ data: { userId: user.id, fullName: "Test Teacher", teacherLoginId: testTeacherLogin } });
    console.log("Test teacher created: Test Teacher /", testTeacherLogin);
  } else {
    console.log("Test teacher already exists, skipping.");
  }

  // Test Student
const testStudentLogin = "STU-TEST1";

const existingStudent = await prisma.student.findUnique({
  where: {
    studentLoginId: testStudentLogin,
  },
});

if (!existingStudent) {
  const studentPassHash = await hashPassword(testStudentLogin);

  const user = await prisma.user.create({
    data: {
      passwordHash: studentPassHash,
      role: "STUDENT",
    },
  });

  // Ensure we have a current school year and at least one section
  const current = await prisma.schoolYear.findFirst({
    where: {
      isCurrent: true,
    },
  });

  let sectionId: string | undefined;

  if (current) {
    const someSection = await prisma.section.findFirst({
      where: {
        schoolYearId: current.id,
      },
    });

    if (someSection) {
      sectionId = someSection.id;
    }
  }

  const student = await prisma.student.create({
    data: {
      userId: user.id,
      fullName: "Test Student",
      studentLoginId: testStudentLogin, gender: "MALE", age: 18, dateOfBirth: new Date("2008-01-01"),
    },
  });

  // Student belongs to a section through StudentEnrollment
  if (current && sectionId) {
    await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        schoolYearId: current.id,
        sectionId,
        status: "ACTIVE",
      },
    });
  }

  console.log(
    "Test student created: Test Student /",
    testStudentLogin
  );
} else {
  console.log("Test student already exists, skipping.");
}
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
