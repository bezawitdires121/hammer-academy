"use server";

import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const PATH = "/dashboard/employee/librarian";

export async function addBook(formData: FormData) {
  const session = await requireRole("LIBRARIAN");
  const title = formData.get("title") as string;
  const author = (formData.get("author") as string) || null;
  const isbn = (formData.get("isbn") as string) || null;
  const category = (formData.get("category") as string) || null;
  const shelf = (formData.get("shelf") as string) || null;
  const grade = formData.get("grade") ? Number(formData.get("grade")) : null;
  const copies = Math.max(1, Number(formData.get("copies") ?? 1));

  if (!title?.trim()) return { error: "Title is required." };

  const book = await prisma.book.create({
    data: {
      title: title.trim(),
      author,
      isbn,
      category,
      shelf,
      grade,
      quantity: copies,
      copies: {
        create: Array.from({ length: copies }, (_, i) => ({ copyNo: i + 1 })),
      },
    },
  });

  revalidatePath(`${PATH}/books`);
  return { bookId: book.id };
}

export async function addCopies(bookId: string, count: number) {
  await requireRole("LIBRARIAN");
  if (count < 1) return { error: "Count must be at least 1." };

  const existing = await prisma.bookCopy.findMany({
    where: { bookId },
    orderBy: { copyNo: "desc" },
    take: 1,
  });
  const nextNo = (existing[0]?.copyNo ?? 0) + 1;

  await prisma.$transaction([
    ...Array.from({ length: count }, (_, i) =>
      prisma.bookCopy.create({ data: { bookId, copyNo: nextNo + i } })
    ),
    prisma.book.update({
      where: { id: bookId },
      data: { quantity: { increment: count } },
    }),
  ]);

  revalidatePath(`${PATH}/books`);
  return { ok: true };
}

export async function issueLoan(formData: FormData) {
  const session = await auth();
  await requireRole("LIBRARIAN");
  if (!session?.user?.id) return { error: "Not authenticated." };

  const studentId = formData.get("studentId") as string;
  const bookCopyId = formData.get("bookCopyId") as string;
  const dueDays = Number(formData.get("dueDays") ?? 14);

  if (!studentId || !bookCopyId) return { error: "Student and copy are required." };

  // Check copy is not already borrowed
  const active = await prisma.loan.findFirst({
    where: { bookCopyId, status: "BORROWED" },
  });
  if (active) return { error: "This copy is already on loan." };

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + dueDays);

  await prisma.loan.create({
    data: {
      bookCopyId,
      studentId,
      dueAt,
      createdById: session.user.id,
    },
  });

  revalidatePath(`${PATH}/loans`);
  return { ok: true };
}

export async function updateLoanStatus(
  loanId: string,
  status: "RETURNED" | "LOST" | "DAMAGED",
  notes?: string
) {
  await requireRole("LIBRARIAN");

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status,
      returnedAt: status === "RETURNED" ? new Date() : undefined,
      notes: notes ?? undefined,
    },
  });

  revalidatePath(`${PATH}/loans`);
  return { ok: true };
}

export async function assignLibraryRole(studentId: string, role: string) {
  await requireRole("LIBRARIAN");
  if (!role.trim()) return { error: "Role is required." };

  const existing = await prisma.studentLibraryRole.findFirst({
    where: { studentId, role },
  });
  if (existing) return { error: "Student already has this role." };

  await prisma.studentLibraryRole.create({ data: { studentId, role } });
  revalidatePath(`${PATH}/students`);
  return { ok: true };
}

export async function removeLibraryRole(roleId: string) {
  await requireRole("LIBRARIAN");
  await prisma.studentLibraryRole.delete({ where: { id: roleId } });
  revalidatePath(`${PATH}/students`);
  return { ok: true };
}
