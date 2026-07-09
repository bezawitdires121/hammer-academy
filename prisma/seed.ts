import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../lib/password";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@hammeracademy.edu";
  const plainPassword = "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await hashPassword(plainPassword);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        adminProfile: {
          create: { fullName: "School Administrator" },
        },
      },
    });
    console.log("Admin created:", user.email);
  } else {
    console.log("Admin already exists, skipping.");
  }

  const subjectNames = ["Mathematics", "English", "Science", "Social Studies", "Amharic"];
  for (const name of subjectNames) {
    await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Subjects seeded.");

  const examExists = await prisma.exam.findFirst({ where: { name: "Term 1 Midterm" } });
  if (!examExists) {
    await prisma.exam.create({
      data: {
        name: "Term 1 Midterm",
        term: "Term 1",
        academicYear: "2025/2026",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-08-10"),
      },
    });
    console.log("Exam seeded.");
  } else {
    console.log("Exam already exists, skipping.");
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