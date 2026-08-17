// audit() — every admin mutation and every PII read writes an AuditLog row. No exceptions.
export interface AuditDb {
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

export interface AuditEntry {
  action: string; // "member.status.change", "application.approve", "pii.read", …
  entityType: string;
  entityId: string;
  actorId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

export async function audit(db: AuditDb, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      before: entry.before === undefined ? undefined : JSON.parse(JSON.stringify(entry.before)),
      after: entry.after === undefined ? undefined : JSON.parse(JSON.stringify(entry.after)),
      ip: entry.ip,
      userAgent: entry.userAgent,
    },
  });
}
