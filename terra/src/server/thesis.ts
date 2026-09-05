import "server-only";
import { db } from "@/lib/db";
import { buildThesis, type Thesis } from "@/lib/engine/thesis";
import {
  modelAllStructures,
  type StructureAssumptions,
  type StructureOutcome,
} from "@/lib/engine/structures";
import {
  evaluateStructuresAgainstObjectives,
  type LegacyFitResult,
  type RankedObjective,
} from "@/lib/engine/legacy";
import { compSetStats, evFromMultiple, valueProperty } from "@/lib/engine/valuation";
import { loadInstitutionProfile, relevantComparables, type InstitutionProfile } from "@/server/institution";

export interface OpportunityAnalysis {
  profile: InstitutionProfile;
  thesis: Thesis;
  structures: StructureOutcome[];
  legacyFit: LegacyFitResult[];
  objectives: RankedObjective[];
  assumptions: StructureAssumptions & { compCount: number; compMedian: number | null };
  opcoValuation: { low: number; high: number } | null;
  propcoValuation: { low: number; high: number } | null;
}

/** Default objectives where a founder profile has not yet been captured. */
const GENERIC_OBJECTIVES: RankedObjective[] = [
  { objective: "MAXIMUM_VALUATION", rank: 1 },
  { objective: "EMPLOYEE_CONTINUITY", rank: 2 },
  { objective: "MAINTAIN_NAME", rank: 3 },
  { objective: "PARTIAL_LIQUIDITY", rank: 4 },
];

export async function analyseOpportunity(slug: string): Promise<OpportunityAnalysis | null> {
  const profile = await loadInstitutionProfile(slug);
  if (!profile) return null;

  const { scored, record, matches, access } = profile;
  const comparables = await relevantComparables(scored);
  const stats = compSetStats(
    comparables.map((c) => ({
      target: c.target, buyer: c.buyer, country: c.country, date: c.date,
      segment: c.segment, evEbitda: c.evEbitda, evRevenue: c.evRevenue,
      realEstateIncluded: c.realEstateIncluded,
    })),
  );

  const owned = record.tenure === "OWNED" || record.tenure === "MIXED";
  const ebitdaPreRent = scored.ebitda ?? 0;
  const marketRent = owned ? scored.marketRent : 0;
  const propertyYield = owned && scored.propertyValueHigh && marketRent
    ? marketRent / ((scored.propertyValueLow ?? 0) + (scored.propertyValueHigh ?? 0)) * 2
    : 0.06;

  const assumptions: StructureAssumptions = {
    ebitdaPreRent,
    opcoMultiple: stats.evEbitda?.median ?? 10.5,
    marketRent,
    propertyYield: propertyYield > 0 ? propertyYield : 0.06,
    existingNetDebt: scored.netDebt ?? 0,
    stakeSold: 0.7,
    growthCapital: Math.round((scored.revenue ?? 0) * 0.6),
    exitYears: 5,
    exitEbitdaGrowth: Math.max(0.03, Math.min(0.12, scored.revenueGrowth ?? 0.06)),
    transactionCostsPct: 0.02,
  };

  const structures = modelAllStructures(assumptions);

  const objectives: RankedObjective[] = record.founderProfile?.objectives.length
    ? record.founderProfile.objectives.map((o) => ({
        objective: o.objective as RankedObjective["objective"],
        rank: o.rank,
      }))
    : GENERIC_OBJECTIVES;

  const legacyFit = evaluateStructuresAgainstObjectives(structures, objectives);

  const opcoEbitda = ebitdaPreRent - marketRent;
  const opcoValuation =
    opcoEbitda > 0
      ? evFromMultiple(opcoEbitda, stats.evEbitda?.low ?? 9, stats.evEbitda?.high ?? 12)
      : null;
  const propcoValuation = owned && marketRent > 0
    ? valueProperty({ marketRent, yieldLow: assumptions.propertyYield - 0.005, yieldHigh: assumptions.propertyYield + 0.007 })
    : null;

  const thesis = buildThesis({
    institutionName: record.name,
    city: record.city,
    ownershipType: record.ownershipType,
    successionStatus: record.successionStatus,
    tenure: record.tenure,
    founderAge: record.founderAge,
    utilisation: record.utilisation,
    score: scored.score,
    structures,
    legacyFit,
    opcoMatches: matches.opco,
    propcoMatches: matches.propco,
    bestPath: access.best,
    accessTier: access.tier,
    opcoValuation,
    propcoValuation,
    recentSignals: record.signals.slice(0, 5).map((s) => ({ headline: s.headline, date: s.date })),
    riskFlags: record.riskFlags.map((r) => ({
      type: r.type,
      severity: r.severity,
      rationale: r.rationale,
    })),
  });

  return {
    profile,
    thesis,
    structures,
    legacyFit,
    objectives,
    assumptions: { ...assumptions, compCount: stats.count, compMedian: stats.evEbitda?.median ?? null },
    opcoValuation,
    propcoValuation,
  };
}
