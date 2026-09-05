import "server-only";
import { db } from "@/lib/db";

/**
 * Every material change and every read of restricted material writes a row.
 * Institutional software has to be able to answer "who changed this, and when".
 */
export async function recordAudit(input: {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW_RESTRICTED" | "OVERRIDE" | "EXPORT" | "IMPORT";
  entityType: string;
  entityId: string;
  field?: string;
  previousValue?: string | null;
  newValue?: string | null;
  context?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        context: input.context,
      },
    });
  } catch {
    // An audit failure must never take down the request that caused it.
  }
}
