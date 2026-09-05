import "server-only";
import { db } from "@/lib/db";
import { canSeeConfidential, type SessionUser } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

export async function loadDeals(user: SessionUser) {
  const deals = await db.deal.findMany({
    where: {
      deletedAt: null,
      ...(canSeeConfidential(user.role) ? {} : { restricted: false }),
    },
    include: {
      leadPartner: { select: { name: true } },
      analyst: { select: { name: true } },
      clientOrg: { select: { slug: true, name: true } },
      assets: { include: { institution: { select: { slug: true, name: true, city: true } } } },
      buyerUniverse: { select: { id: true, stage: true } },
      processItems: { select: { status: true } },
      interactions: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
    },
    orderBy: [{ stage: "asc" }, { expectedEv: "desc" }],
  });

  return deals.map((d) => {
    const complete = d.processItems.filter((p) => p.status === "COMPLETE").length;
    const engaged = d.buyerUniverse.filter(
      (b) => !["LONGLIST", "APPROVED", "REJECTED"].includes(b.stage),
    ).length;
    return {
      ...d,
      progress: d.processItems.length ? complete / d.processItems.length : 0,
      buyersEngaged: engaged,
      buyersTotal: d.buyerUniverse.length,
      lastInteractionAt: d.interactions[0]?.date ?? null,
    };
  });
}

export async function loadDeal(slug: string, user: SessionUser) {
  const deal = await db.deal.findFirst({
    where: { slug, deletedAt: null },
    include: {
      leadPartner: { select: { id: true, name: true, title: true } },
      analyst: { select: { id: true, name: true, title: true } },
      clientOrg: { select: { id: true, slug: true, name: true, type: true } },
      opportunity: { select: { id: true, whyNow: true, thesis: true, source: true } },
      assets: {
        include: {
          institution: {
            select: {
              id: true, slug: true, name: true, city: true, country: true, type: true,
              students: true, capacity: true, tenure: true, ownershipType: true,
              financials: { orderBy: { year: "desc" }, take: 1 },
              properties: { take: 1 },
            },
          },
          property: true,
        },
      },
      participants: {
        include: {
          person: { select: { id: true, slug: true, firstName: true, lastName: true, title: true } },
          organisation: { select: { id: true, slug: true, name: true } },
        },
      },
      stageHistory: { orderBy: { enteredAt: "asc" } },
      buyerUniverse: {
        include: {
          organisation: { select: { id: true, slug: true, name: true, type: true, hq: true } },
        },
        orderBy: [{ stage: "asc" }, { sortIndex: "asc" }],
      },
      processItems: { orderBy: { sortIndex: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      tasks: { include: { assignee: { select: { name: true } } }, orderBy: { dueDate: "asc" } },
      stakeholders: true,
      riskFlags: { orderBy: { severity: "desc" } },
      returns: true,
      interactions: {
        orderBy: { date: "desc" },
        include: {
          participants: {
            include: { person: { select: { id: true, slug: true, firstName: true, lastName: true } } },
          },
          loggedBy: { select: { name: true } },
        },
      },
      notes: {
        where: canSeeConfidential(user.role) ? {} : { partnerConfidential: false },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!deal) return null;

  if (deal.restricted && !canSeeConfidential(user.role)) return "RESTRICTED" as const;

  if (deal.restricted) {
    await recordAudit({
      userId: user.id,
      action: "VIEW_RESTRICTED",
      entityType: "Deal",
      entityId: deal.id,
      context: deal.codeName,
    });
  }

  return deal;
}

/** Days each closed stage took, plus days in the current one. */
export function stageDurations(
  history: { stage: string; enteredAt: Date; exitedAt: Date | null }[],
) {
  return history.map((h) => {
    const end = h.exitedAt ?? new Date();
    return {
      stage: h.stage,
      days: Math.max(0, Math.round((end.getTime() - h.enteredAt.getTime()) / 86_400_000)),
      enteredAt: h.enteredAt,
      exitedAt: h.exitedAt,
      current: h.exitedAt === null,
    };
  });
}

export const BUYER_STAGES = [
  "LONGLIST",
  "APPROVED",
  "CONTACTED",
  "NDA",
  "CIM",
  "MANAGEMENT_MEETING",
  "IOI",
  "LOI",
  "DILIGENCE",
  "SELECTED",
  "REJECTED",
] as const;

export function dealSummary(
  deals: Awaited<ReturnType<typeof loadDeals>>,
) {
  const live = deals.filter((d) => !["CLOSED", "LOST"].includes(d.stage));
  return {
    live: live.length,
    closed: deals.filter((d) => d.stage === "CLOSED").length,
    ev: live.reduce((a, d) => a + (d.expectedEv ?? 0), 0),
    fees: live.reduce((a, d) => a + (d.expectedFee ?? 0), 0),
    weightedFees: Math.round(
      live.reduce((a, d) => a + (d.expectedFee ?? 0) * (d.probability ?? 0), 0),
    ),
    blocked: live.filter((d) => d.keyBlocker).length,
  };
}
