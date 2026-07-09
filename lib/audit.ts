import { prisma } from "@/lib/prisma";

export async function logAction(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined },
  });
}