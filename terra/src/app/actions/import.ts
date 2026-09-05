"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  parseCsv,
  inferMapping,
  validateRows,
  COLUMN_SPECS,
  type ImportKind,
  type ValidationResult,
} from "@/lib/import";

const KINDS = ["institutions", "contacts", "investors", "transactions"] as const;

const PreviewSchema = z.object({
  kind: z.enum(KINDS),
  csv: z.string().min(1).max(2_000_000),
  mapping: z.record(z.string(), z.number().int().nullable()).optional(),
});

export interface PreviewResult {
  ok: boolean;
  error?: string;
  headers?: string[];
  mapping?: Record<string, number | null>;
  validation?: ValidationResult;
  sampleSize?: number;
}

/** Parses, maps and validates without writing anything. */
export async function previewImport(input: unknown): Promise<PreviewResult> {
  await requireRole("ASSOCIATE");
  const parsed = PreviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That file could not be read." };

  const csv = parseCsv(parsed.data.csv);
  if (csv.headers.length === 0) {
    return { ok: false, error: "No header row found." };
  }
  if (csv.rows.length === 0) {
    return { ok: false, error: "The file has a header but no rows." };
  }

  const mapping = parsed.data.mapping ?? inferMapping(csv.headers, parsed.data.kind);
  const existing = await existingNames(parsed.data.kind);
  const validation = validateRows(csv, mapping, parsed.data.kind, existing);

  return {
    ok: true,
    headers: csv.headers,
    mapping,
    validation,
    sampleSize: csv.rows.length,
  };
}

async function existingNames(kind: ImportKind): Promise<string[]> {
  switch (kind) {
    case "institutions":
      return (await db.educationInstitution.findMany({ select: { name: true } })).map((r) => r.name);
    case "investors":
      return (await db.organisation.findMany({ select: { name: true } })).map((r) => r.name);
    case "contacts":
      return (await db.person.findMany({ select: { firstName: true, lastName: true } })).map(
        (r) => `${r.firstName} ${r.lastName}`,
      );
    case "transactions":
      return (await db.transactionComparable.findMany({ select: { buyer: true, target: true } })).map(
        (r) => `${r.buyer} ${r.target}`,
      );
  }
}

/**
 * Records what an import would do without writing to the market database.
 *
 * Deliberate: the demo database is internally consistent — every financial
 * figure derives from the same assumptions — and letting a CSV write into it
 * would break that. The parse, mapping, validation and duplicate detection are
 * all real; only the final insert is withheld, and the audit row says so.
 */
export async function commitImport(input: unknown) {
  const user = await requireRole("ASSOCIATE");
  const parsed = PreviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That file could not be read." };

  const csv = parseCsv(parsed.data.csv);
  const mapping = parsed.data.mapping ?? inferMapping(csv.headers, parsed.data.kind);
  const existing = await existingNames(parsed.data.kind);
  const validation = validateRows(csv, mapping, parsed.data.kind, existing);

  await recordAudit({
    userId: user.id,
    action: "IMPORT",
    entityType: parsed.data.kind,
    entityId: "csv-import",
    context: `${validation.importable} importable of ${validation.rows.length} rows · ${validation.errors} errors · ${validation.duplicates} duplicates · staged, not written`,
  });

  revalidatePath("/settings");

  return {
    ok: true as const,
    staged: validation.importable,
    total: validation.rows.length,
    errors: validation.errors,
    duplicates: validation.duplicates,
    note: "Rows validated and staged. Writing into the demo database is disabled so the seeded market data stays internally consistent; the import is recorded in the audit log.",
  };
}

export async function importColumnSpecs(kind: ImportKind) {
  return COLUMN_SPECS[kind];
}
