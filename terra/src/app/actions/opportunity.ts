"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const StageSchema = z.object({
  opportunityId: z.string().min(1),
  stage: z.enum([
    "LEAD",
    "QUALIFIED",
    "MANDATE_DISCUSSION",
    "ENGAGED",
    "PREPARATION",
    "MARKETED",
    "IOI",
    "LOI",
    "DUE_DILIGENCE",
    "SIGNING",
    "CLOSING",
    "CLOSED",
    "LOST",
    "PAUSED",
  ]),
});

export async function moveOpportunityStage(input: unknown) {
  const user = await requireUser();
  const parsed = StageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid stage change." };

  const existing = await db.opportunity.findUnique({
    where: { id: parsed.data.opportunityId },
    select: { id: true, stage: true, name: true },
  });
  if (!existing) return { ok: false as const, error: "Opportunity not found." };
  if (existing.stage === parsed.data.stage) return { ok: true as const };

  await db.opportunity.update({
    where: { id: existing.id },
    data: { stage: parsed.data.stage },
  });

  await recordAudit({
    userId: user.id,
    action: "UPDATE",
    entityType: "Opportunity",
    entityId: existing.id,
    field: "stage",
    previousValue: existing.stage,
    newValue: parsed.data.stage,
    context: existing.name,
  });

  revalidatePath("/origination");
  revalidatePath("/command");
  return { ok: true as const };
}

const WhyNowSchema = z.object({
  opportunityId: z.string().min(1),
  whyNow: z.string().trim().min(20, "Say why in at least a sentence.").max(2000),
});

/** The analyst must be able to justify approaching now, in their own words. */
export async function updateWhyNow(input: unknown) {
  const user = await requireUser();
  const parsed = WhyNowSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.opportunity.findUnique({
    where: { id: parsed.data.opportunityId },
    select: { id: true, whyNow: true, name: true },
  });
  if (!existing) return { ok: false as const, error: "Opportunity not found." };

  await db.opportunity.update({
    where: { id: existing.id },
    data: { whyNow: parsed.data.whyNow },
  });

  await recordAudit({
    userId: user.id,
    action: "UPDATE",
    entityType: "Opportunity",
    entityId: existing.id,
    field: "whyNow",
    previousValue: existing.whyNow,
    newValue: parsed.data.whyNow,
    context: existing.name,
  });

  revalidatePath("/origination");
  return { ok: true as const };
}

const OverrideSchema = z.object({
  institutionId: z.string().min(1),
  score: z.coerce.number().int().min(0).max(100),
  rationale: z
    .string()
    .trim()
    .min(20, "An override without a reason is not institutional knowledge — say why."),
});

/**
 * A partner may overrule the model, but the reason is mandatory. That reason is
 * how judgment re-enters the system rather than leaving it.
 */
export async function overrideScore(input: unknown) {
  const user = await requireUser();
  const parsed = OverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.scoreOverride.findUnique({
    where: { institutionId: parsed.data.institutionId },
  });

  await db.scoreOverride.upsert({
    where: { institutionId: parsed.data.institutionId },
    create: {
      institutionId: parsed.data.institutionId,
      score: parsed.data.score,
      rationale: parsed.data.rationale,
      userId: user.id,
    },
    update: {
      score: parsed.data.score,
      rationale: parsed.data.rationale,
      userId: user.id,
    },
  });

  await recordAudit({
    userId: user.id,
    action: "OVERRIDE",
    entityType: "EducationInstitution",
    entityId: parsed.data.institutionId,
    field: "opportunityScore",
    previousValue: existing ? String(existing.score) : "computed",
    newValue: String(parsed.data.score),
    context: parsed.data.rationale,
  });

  revalidatePath("/atlas");
  revalidatePath("/command");
  revalidatePath("/origination");
  return { ok: true as const };
}

export async function clearScoreOverride(institutionId: string) {
  const user = await requireUser();
  const existing = await db.scoreOverride.findUnique({ where: { institutionId } });
  if (!existing) return { ok: true as const };

  await db.scoreOverride.delete({ where: { institutionId } });
  await recordAudit({
    userId: user.id,
    action: "OVERRIDE",
    entityType: "EducationInstitution",
    entityId: institutionId,
    field: "opportunityScore",
    previousValue: String(existing.score),
    newValue: "computed",
    context: "Override cleared",
  });

  revalidatePath("/atlas");
  revalidatePath("/command");
  return { ok: true as const };
}
