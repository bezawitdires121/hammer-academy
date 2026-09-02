"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createClub(formData: FormData) {
  const admin = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const clubType = (formData.get("clubType") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name) throw new Error("Club name is required.");

  const existing = await prisma.club.findFirst({ where: { name } });
  if (existing) throw new Error("A club with this name already exists.");

  const club = await prisma.club.create({
    data: { name, clubType, description },
  });

  await logAction(admin.user.id, "CLUB_CREATED", "Club", club.id, { name });

  revalidatePath("/dashboard/admin/clubs");
  revalidatePath("/dashboard/admin/teachers");
}

export async function deleteClub(formData: FormData) {
  const admin = await requireAdmin();

  const clubId = formData.get("clubId") as string;
  if (!clubId) throw new Error("Missing clubId.");

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { _count: { select: { memberships: true } } },
  });
  if (!club) throw new Error("Club not found.");

  if (club._count.memberships > 0) {
    throw new Error(
      "Cannot delete a club that has members. Remove all members first."
    );
  }

  await prisma.club.delete({ where: { id: clubId } });

  await logAction(admin.user.id, "CLUB_DELETED", "Club", clubId, {
    name: club.name,
  });

  revalidatePath("/dashboard/admin/clubs");
}
