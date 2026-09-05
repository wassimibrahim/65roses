import "server-only";
import { db } from "@/lib/db";
import { scoreUniverse, type ScoredInstitution } from "@/server/scoring";
import { splitMatches } from "@/server/matching";

export const PIPELINE_STAGES = [
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
] as const;

/** Stages an origination board actually works in. The rest live in Deals. */
export const ORIGINATION_STAGES = [
  "LEAD",
  "QUALIFIED",
  "MANDATE_DISCUSSION",
  "ENGAGED",
  "PAUSED",
] as const;

export interface OpportunityRow {
  id: string;
  name: string;
  stage: string;
  transactionType: string | null;
  estimatedEvLow: number | null;
  estimatedEvHigh: number | null;
  whyNow: string | null;
  nextAction: string | null;
  nextActionDate: Date | null;
  lastContactAt: Date | null;
  probability: number | null;
  source: string;
  sourceNote: string | null;
  ownerName: string | null;
  institution: ScoredInstitution;
  topMatches: { name: string; score: number }[];
  matchCount: number;
}

export async function loadOpportunities(): Promise<OpportunityRow[]> {
  const [records, universe] = await Promise.all([
    db.opportunity.findMany({
      where: { deletedAt: null },
      include: { owner: { select: { name: true } } },
    }),
    scoreUniverse(),
  ]);
  const byId = new Map(universe.map((i) => [i.id, i]));

  const rows = await Promise.all(
    records.map(async (o): Promise<OpportunityRow | null> => {
      const institution = byId.get(o.institutionId);
      if (!institution) return null;
      const { opco } = await splitMatches(institution);
      return {
        id: o.id,
        name: o.name,
        stage: o.stage,
        transactionType: o.transactionType,
        estimatedEvLow: o.estimatedEvLow,
        estimatedEvHigh: o.estimatedEvHigh,
        whyNow: o.whyNow,
        nextAction: o.nextAction,
        nextActionDate: o.nextActionDate,
        lastContactAt: o.lastContactAt,
        probability: o.mandateProbability,
        source: o.source,
        sourceNote: o.sourceNote,
        ownerName: o.owner?.name ?? null,
        institution,
        topMatches: opco.slice(0, 3).map((m) => ({ name: m.organisationName, score: m.score })),
        matchCount: opco.length,
      };
    }),
  );

  return rows
    .filter((r): r is OpportunityRow => r !== null)
    .sort((a, b) => b.institution.displayScore - a.institution.displayScore);
}

/**
 * High-scoring institutions Terra has not yet opened an opportunity on.
 * This is where proprietary origination actually comes from.
 */
export async function uncoveredTargets(minScore = 65, limit = 12) {
  const [universe, opportunities] = await Promise.all([
    scoreUniverse(),
    db.opportunity.findMany({ where: { deletedAt: null }, select: { institutionId: true } }),
  ]);
  const covered = new Set(opportunities.map((o) => o.institutionId));

  return universe
    .filter((i) => !covered.has(i.id) && i.displayScore >= minScore)
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, limit);
}

export function originationSummary(rows: OpportunityRow[]) {
  const active = rows.filter((r) => !["LOST", "CLOSED"].includes(r.stage));
  return {
    count: rows.length,
    activeCount: active.length,
    evLow: active.reduce((a, r) => a + (r.estimatedEvLow ?? 0), 0),
    evHigh: active.reduce((a, r) => a + (r.estimatedEvHigh ?? 0), 0),
    weightedEv: Math.round(
      active.reduce((a, r) => a + (r.estimatedEvHigh ?? 0) * (r.probability ?? 0), 0),
    ),
    proprietary: rows.filter((r) => r.source === "TERRA_RESEARCH").length,
    withoutWhyNow: rows.filter((r) => !r.whyNow?.trim()).length,
    overdue: rows.filter(
      (r) => r.nextActionDate && r.nextActionDate.getTime() < Date.now(),
    ).length,
  };
}

/** Origination by source — the flywheel's input mix. */
export function bySource(rows: OpportunityRow[]) {
  const map = new Map<string, { count: number; ev: number }>();
  for (const row of rows) {
    const entry = map.get(row.source) ?? { count: 0, ev: 0 };
    entry.count += 1;
    entry.ev += row.estimatedEvHigh ?? 0;
    map.set(row.source, entry);
  }
  return [...map.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.count - a.count);
}
