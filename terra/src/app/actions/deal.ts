"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const BuyerStageSchema = z.object({
  entryId: z.string().min(1),
  stage: z.enum([
    "LONGLIST", "APPROVED", "CONTACTED", "NDA", "CIM", "IOI",
    "MANAGEMENT_MEETING", "LOI", "DILIGENCE", "SELECTED", "REJECTED",
  ]),
});

export async function moveBuyerStage(input: unknown) {
  const user = await requireUser();
  const parsed = BuyerStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid stage." };

  const entry = await db.buyerUniverseEntry.findUnique({
    where: { id: parsed.data.entryId },
    include: { organisation: { select: { name: true } }, deal: { select: { slug: true, codeName: true } } },
  });
  if (!entry) return { ok: false as const, error: "Buyer not found." };
  if (entry.stage === parsed.data.stage) return { ok: true as const };

  // Reaching a stage records when it happened, so the process timeline is real.
  const now = new Date();
  const timestamps: Record<string, Date | undefined> = {};
  if (parsed.data.stage === "NDA" && !entry.ndaSignedAt) timestamps.ndaSignedAt = now;
  if (parsed.data.stage === "CONTACTED" && !entry.teaserSentAt) timestamps.teaserSentAt = now;
  if (parsed.data.stage === "CIM" && !entry.cimSentAt) timestamps.cimSentAt = now;
  if (parsed.data.stage === "IOI" && !entry.ioiAt) timestamps.ioiAt = now;
  if (parsed.data.stage === "LOI" && !entry.loiAt) timestamps.loiAt = now;

  await db.buyerUniverseEntry.update({
    where: { id: entry.id },
    data: { stage: parsed.data.stage, ...timestamps },
  });

  await recordAudit({
    userId: user.id,
    action: "UPDATE",
    entityType: "BuyerUniverseEntry",
    entityId: entry.id,
    field: "stage",
    previousValue: entry.stage,
    newValue: parsed.data.stage,
    context: `${entry.deal.codeName} · ${entry.organisation.name}`,
  });

  revalidatePath(`/deals/${entry.deal.slug}`);
  return { ok: true as const };
}

const ProcessItemSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETE", "NOT_APPLICABLE"]),
});

export async function setProcessItemStatus(input: unknown) {
  const user = await requireUser();
  const parsed = ProcessItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid status." };

  const item = await db.processItem.findUnique({
    where: { id: parsed.data.itemId },
    include: { deal: { select: { slug: true, codeName: true } } },
  });
  if (!item) return { ok: false as const, error: "Checklist item not found." };

  await db.processItem.update({
    where: { id: item.id },
    data: { status: parsed.data.status },
  });

  await recordAudit({
    userId: user.id,
    action: "UPDATE",
    entityType: "ProcessItem",
    entityId: item.id,
    field: "status",
    previousValue: item.status,
    newValue: parsed.data.status,
    context: `${item.deal.codeName} · ${item.label}`,
  });

  revalidatePath(`/deals/${item.deal.slug}`);
  return { ok: true as const };
}
