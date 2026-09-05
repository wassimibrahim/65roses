import "server-only";
import { db } from "@/lib/db";
import { scoreUniverse, type ScoredInstitution } from "@/server/scoring";
import { splitMatches, targetsForMandate } from "@/server/matching";

export interface PriorityOpportunity {
  institution: ScoredInstitution;
  whyNow: string[];
  recommendedAction: string;
  opportunityId: string | null;
  stage: string | null;
  /** Buyers for the operating business. */
  topMatches: { name: string; score: number }[];
  /** Institutional owners for the campus, where there is one to sell. */
  propcoMatches: { name: string; score: number }[];
}

/**
 * The ranked list on Command. Anything already in due diligence is not a
 * question Terra needs answered this morning, so live executions are excluded.
 */
export async function priorityOpportunities(limit = 8): Promise<PriorityOpportunity[]> {
  const universe = await scoreUniverse();
  const opportunities = await db.opportunity.findMany({
    where: { deletedAt: null },
    select: { id: true, institutionId: true, whyNow: true, nextAction: true, stage: true },
  });
  const byInstitution = new Map(opportunities.map((o) => [o.institutionId, o]));

  const LATE_STAGE = new Set(["DUE_DILIGENCE", "SIGNING", "CLOSING", "CLOSED", "LOST"]);

  const candidates = universe
    .filter((i) => {
      const opp = byInstitution.get(i.id);
      return !opp || !LATE_STAGE.has(opp.stage);
    })
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, limit);

  return Promise.all(
    candidates.map(async (institution) => {
      const opp = byInstitution.get(institution.id);
      // OpCo and PropCo buyers answer different questions and are never mixed
      // into a single "buyers" list.
      const { opco, propco } = await splitMatches(institution);

      const whyNow: string[] = [];
      if (opp?.whyNow) {
        // An analyst's own words beat anything generated.
        whyNow.push(opp.whyNow);
      } else {
        whyNow.push(...institution.score.evidence.slice(0, 4));
      }

      return {
        institution,
        whyNow,
        recommendedAction:
          opp?.nextAction ??
          (institution.accessTier === "COLD"
            ? `Identify a route to ${institution.name} before any approach`
            : `Request a confidential founder meeting`),
        opportunityId: opp?.id ?? null,
        stage: opp?.stage ?? null,
        topMatches: opco.slice(0, 3).map((m) => ({ name: m.organisationName, score: m.score })),
        propcoMatches: propco.slice(0, 2).map((m) => ({ name: m.organisationName, score: m.score })),
      };
    }),
  );
}

export interface DealPulseRow {
  id: string;
  slug: string;
  codeName: string;
  stage: string;
  client: string;
  expectedEv: number | null;
  expectedFee: number | null;
  probability: number | null;
  nextMilestone: string | null;
  nextMilestoneDue: Date | null;
  daysSinceInteraction: number | null;
  partner: string | null;
  blocker: string | null;
}

export async function dealPulse(): Promise<DealPulseRow[]> {
  const deals = await db.deal.findMany({
    where: { deletedAt: null, stage: { notIn: ["CLOSED", "LOST"] } },
    include: {
      leadPartner: { select: { name: true } },
      interactions: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
      processItems: {
        where: { status: { in: ["IN_PROGRESS", "NOT_STARTED"] } },
        orderBy: { sortIndex: "asc" },
        take: 1,
      },
    },
    orderBy: { expectedEv: "desc" },
  });

  return deals.map((d) => {
    const last = d.interactions[0]?.date ?? null;
    return {
      id: d.id,
      slug: d.slug,
      codeName: d.codeName,
      stage: d.stage,
      client: d.clientLabel ?? "—",
      expectedEv: d.expectedEv,
      expectedFee: d.expectedFee,
      probability: d.probability,
      nextMilestone: d.processItems[0]?.label ?? null,
      nextMilestoneDue: d.processItems[0]?.dueDate ?? null,
      daysSinceInteraction: last
        ? Math.floor((Date.now() - last.getTime()) / 86_400_000)
        : null,
      partner: d.leadPartner?.name ?? null,
      blocker: d.keyBlocker,
    };
  });
}

export interface FollowUp {
  id: string;
  kind: "COLD" | "COMMITMENT" | "MANDATE" | "SIGNAL";
  text: string;
  detail?: string;
  href: string;
  urgency: number;
}

/**
 * The follow-ups a partner would otherwise carry in their head: relationships
 * going quiet, promises made, mandates that have just changed what matters.
 */
export async function followUps(limit = 8): Promise<FollowUp[]> {
  const now = Date.now();
  const items: FollowUp[] = [];

  // Strong relationships that have gone quiet.
  const cold = await db.relationship.findMany({
    where: {
      fromPerson: { isInternal: true },
      strength: { gte: 4 },
      lastInteractionAt: { not: null },
      toPersonId: { not: null },
    },
    select: {
      id: true,
      strength: true,
      lastInteractionAt: true,
      notes: true,
      fromPerson: { select: { firstName: true } },
      toPerson: { select: { slug: true, firstName: true, lastName: true, organisation: { select: { name: true } } } },
    },
  });
  for (const r of cold) {
    const days = Math.floor((now - r.lastInteractionAt!.getTime()) / 86_400_000);
    if (days < 40) continue;
    items.push({
      id: `cold-${r.id}`,
      kind: "COLD",
      text: `${r.fromPerson.firstName} has not spoken to ${r.toPerson!.firstName} ${r.toPerson!.lastName} in ${days} days.`,
      detail: r.toPerson!.organisation?.name ?? r.notes ?? undefined,
      href: `/relationships/${r.toPerson!.slug}`,
      urgency: Math.min(100, days),
    });
  }

  // Commitments made in a meeting and not yet closed out.
  const commitments = await db.interaction.findMany({
    where: { nextStep: { not: null }, followUpDate: { lte: new Date(now + 14 * 86_400_000) } },
    orderBy: { followUpDate: "asc" },
    take: 12,
    select: {
      id: true, nextStep: true, summary: true, followUpDate: true,
      institution: { select: { slug: true, name: true } },
      deal: { select: { slug: true, codeName: true } },
      participants: { select: { person: { select: { firstName: true, lastName: true, isInternal: true } } } },
    },
  });
  for (const c of commitments) {
    const external = c.participants.map((p) => p.person).find((p) => !p.isInternal);
    items.push({
      id: `commit-${c.id}`,
      kind: "COMMITMENT",
      text: c.nextStep!,
      detail: [external ? `${external.firstName} ${external.lastName}` : null, c.institution?.name ?? c.deal?.codeName]
        .filter(Boolean)
        .join(" · "),
      href: c.institution ? `/atlas/${c.institution.slug}` : c.deal ? `/deals/${c.deal.slug}` : "/relationships",
      urgency: c.followUpDate ? Math.max(0, 60 - Math.floor((c.followUpDate.getTime() - now) / 86_400_000)) : 30,
    });
  }

  // Recently confirmed mandates: what has just become relevant.
  const freshMandates = await db.investorMandate.findMany({
    where: { isActive: true, lastConfirmed: { gte: new Date(now - 75 * 86_400_000) } },
    select: { id: true, name: true, organisation: { select: { name: true, slug: true } } },
    take: 4,
  });
  for (const m of freshMandates) {
    const targets = await targetsForMandate(m.id, { limit: 30 });
    const uncontacted = targets.filter((t) => t.score >= 75 && !t.institution.hasOpportunity);
    if (uncontacted.length === 0) continue;
    items.push({
      id: `mandate-${m.id}`,
      kind: "MANDATE",
      text: `${m.organisation.name} mandate — ${uncontacted.length} newly identified target${uncontacted.length > 1 ? "s" : ""} fit the criteria.`,
      detail: uncontacted.slice(0, 3).map((t) => t.institution.name).join(", "),
      href: `/investors/${m.organisation.slug}?mandate=${m.id}`,
      urgency: 55 + uncontacted.length * 3,
    });
  }

  // Signals that change how a relationship should be handled.
  const signals = await db.signal.findMany({
    where: {
      date: { gte: new Date(now - 120 * 86_400_000) },
      strength: "STRONG",
      institutionId: { not: null },
    },
    orderBy: { date: "desc" },
    take: 6,
    select: {
      id: true, headline: true, transactionImplication: true,
      institution: { select: { slug: true, name: true } },
    },
  });
  for (const s of signals) {
    items.push({
      id: `signal-${s.id}`,
      kind: "SIGNAL",
      text: `${s.institution!.name}: ${s.headline.toLowerCase()}.`,
      detail: s.transactionImplication ?? undefined,
      href: `/atlas/${s.institution!.slug}?tab=signals`,
      urgency: 45,
    });
  }

  return items.sort((a, b) => b.urgency - a.urgency).slice(0, limit);
}

export interface PipelineMetrics {
  potentialEv: number;
  activeMandates: number;
  weightedFeePipeline: number;
  qualifiedProprietary: number;
  activeInvestorMandates: number;
  founderConversationsThisQuarter: number;
  transactionsClosed: number;
  repeatClientPct: number;
}

export async function pipelineMetrics(): Promise<PipelineMetrics> {
  const quarterStart = new Date();
  quarterStart.setMonth(Math.floor(quarterStart.getMonth() / 3) * 3, 1);
  quarterStart.setHours(0, 0, 0, 0);

  const [deals, opportunities, mandates, founderConversations, closed, clients] = await Promise.all([
    db.deal.findMany({
      where: { deletedAt: null, stage: { notIn: ["CLOSED", "LOST"] } },
      select: { expectedEv: true, expectedFee: true, probability: true },
    }),
    db.opportunity.findMany({
      where: { deletedAt: null },
      select: { stage: true, estimatedEvHigh: true, source: true },
    }),
    db.investorMandate.count({ where: { isActive: true } }),
    db.interaction.count({
      where: {
        date: { gte: quarterStart },
        type: { in: ["MEETING", "CALL", "DINNER"] },
        institution: { ownershipType: { in: ["FOUNDER", "FAMILY"] } },
      },
    }),
    db.deal.count({ where: { stage: "CLOSED" } }),
    db.deal.findMany({ where: { deletedAt: null }, select: { clientLabel: true } }),
  ]);

  const QUALIFIED = new Set(["QUALIFIED", "MANDATE_DISCUSSION", "ENGAGED"]);
  const uniqueClients = new Set(clients.map((c) => c.clientLabel));
  const repeatClientPct =
    clients.length > 0 ? 1 - uniqueClients.size / clients.length : 0;

  return {
    potentialEv:
      deals.reduce((a, d) => a + (d.expectedEv ?? 0), 0) +
      opportunities.reduce((a, o) => a + (o.estimatedEvHigh ?? 0), 0),
    activeMandates: deals.length,
    weightedFeePipeline: Math.round(
      deals.reduce((a, d) => a + (d.expectedFee ?? 0) * (d.probability ?? 0), 0),
    ),
    qualifiedProprietary: opportunities.filter(
      (o) => QUALIFIED.has(o.stage) && o.source === "TERRA_RESEARCH",
    ).length,
    activeInvestorMandates: mandates,
    founderConversationsThisQuarter: founderConversations,
    transactionsClosed: closed,
    repeatClientPct,
  };
}

export async function recentSignals(limit = 8) {
  return db.signal.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      institution: { select: { slug: true, name: true, city: true } },
      source: { select: { name: true } },
    },
  });
}
