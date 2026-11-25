import prisma from "@/lib/prisma";

/**
 * Records a deletion tombstone in MutationReceipt when a server action deletes
 * an entity directly so other devices discover the deletion on incremental pull.
 */
export async function recordDeletionTombstone(
  userId: string,
  entityType: string,
  entityId: string
): Promise<void> {
  try {
    await prisma.mutationReceipt.create({
      data: {
        id: `del_${crypto.randomUUID()}`,
        userId,
        entityType,
        entityId,
        action: "delete",
      },
    });
  } catch {
    // Non-fatal: tombstone failure should never abort an already-committed delete
  }
}
