import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  scoreOpportunity,
  DEFAULT_WEIGHTS,
  type ScoringInput,
  type ScoringWeights,
} from "@/lib/engine/scoring";
import type { ScoreResult } from "@/lib/engine/types";
import { assessAccessMany } from "@/server/graph";

const TIER_1 = ["Madrid", "Barcelona", "Lisbon", "Milan", "Paris", "Zurich", "Dubai", "London"];
const TIER_2 = [
  "Valencia", "Seville", "Bilbao", "Málaga", "Marbella", "Porto", "Rome", "Lyon",
  "Alcobendas", "Las Rozas", "Zaragoza", "Alicante", "Girona",
];

function marketTier(city: string | null): 1 | 2 | 3 {
  if (!city) return 3;
  if (TIER_1.includes(city)) return 1;
  if (TIER_2.includes(city)) return 2;
  return 3;
}

/** Reputation is not stored as a number on the record; it is read from what we know. */
function reputationFrom(input: {
  accreditations: string[];
  tuitionAverage: number | null;
  utilisation: number | null;
  foundedYear: number | null;
}): number | null {
  const parts: number[] = [];
  if (input.accreditations.length) parts.push(Math.min(100, 60 + input.accreditations.length * 15));
  if (input.tuitionAverage) parts.push(Math.min(100, 35 + (input.tuitionAverage / 20000) * 65));
  if (input.utilisation) parts.push(Math.min(100, input.utilisation * 100));
  if (input.foundedYear) parts.push(Math.min(100, 40 + (new Date().getFullYear() - input.foundedYear) * 0.6));
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export const loadWeights = cache(async (): Promise<ScoringWeights> => {
  const stored = await db.scoringWeights.findFirst({ where: { isDefault: true } });
  if (!stored) return DEFAULT_WEIGHTS;
  const w = stored.weights as Partial<ScoringWeights>;
  return { ...DEFAULT_WEIGHTS, ...w };
});

export interface ScoredInstitution {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string;
  type: string;
  ownershipType: string;
  successionStatus: string;
  tenure: string;
  students: number | null;
  capacity: number | null;
  utilisation: number | null;
  familyName: string | null;
  founderAge: number | null;
  curriculum: string[];
  latitude: number | null;
  longitude: number | null;
  summary: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  revenueGrowth: number | null;
  netDebt: number | null;
  marketRent: number;
  propertyValueLow: number | null;
  propertyValueHigh: number | null;
  enterpriseValueLow: number;
  enterpriseValueHigh: number;
  matchCount: number;
  strongMatchCount: number;
  bestMatchScore: number;
  signalCount: number;
  recentSignalCount: number;
  lastInteractionAt: Date | null;
  accessTier: string;
  accessNarrative: string | null;
  relationshipStrength: number;
  score: ScoreResult;
  /** Headline score after any partner override. */
  displayScore: number;
  overridden: boolean;
  overrideRationale: string | null;
  hasOpportunity: boolean;
  opportunityStage: string | null;
  riskCount: number;
}

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 730;

/**
 * Scores the entire universe in one pass. Command, Atlas and Origination all
 * read from here so a school's score is identical wherever it appears.
 */
export const scoreUniverse = cache(async (): Promise<ScoredInstitution[]> => {
  const weights = await loadWeights();

  const institutions = await db.educationInstitution.findMany({
    where: { deletedAt: null },
    include: {
      financials: { orderBy: { year: "desc" }, take: 2 },
      properties: true,
      matches: { select: { score: true, mandate: { select: { isActive: true } } } },
      signals: { select: { date: true, type: true } },
      opportunities: { select: { stage: true, lastContactAt: true } },
      riskFlags: { select: { id: true } },
      scoreOverride: { select: { score: true, rationale: true } },
      interactions: { select: { date: true }, orderBy: { date: "desc" }, take: 1 },
    },
  });

  const access = await assessAccessMany(institutions.map((i) => i.id));
  const now = Date.now();

  return institutions.map((inst) => {
    const latest = inst.financials[0];
    const previous = inst.financials[1];
    const property = inst.properties[0];
    const owned = inst.tenure === "OWNED" || inst.tenure === "MIXED";

    const marketRent = property?.marketRentEstimate ?? 0;
    const revenue = latest?.revenue ?? null;
    const ebitda = latest?.ebitda ?? null;
    const opcoEbitda = owned && ebitda !== null ? ebitda - marketRent : ebitda;

    const propertyValueLow = owned ? (property?.valueEstimateLow ?? null) : null;
    const propertyValueHigh = owned ? (property?.valueEstimateHigh ?? null) : null;

    const evLow = Math.max(0, Math.round((opcoEbitda ?? 0) * 9)) + (propertyValueLow ?? 0);
    const evHigh = Math.max(0, Math.round((opcoEbitda ?? 0) * 12)) + (propertyValueHigh ?? 0);

    const activeMatches = inst.matches.filter((m) => m.mandate.isActive);
    const matchScores = activeMatches.map((m) => m.score);
    const strongMatches = matchScores.filter((s) => s >= 70);

    const recentSignals = inst.signals.filter((s) => now - s.date.getTime() < TWO_YEARS_MS);
    const STRATEGIC_SIGNALS = new Set([
      "LEADERSHIP_CHANGE", "FOUNDER_RETIREMENT", "NEW_CEO", "CAPITAL_RAISE",
      "REFINANCING", "CAMPUS_EXPANSION", "PROPERTY_ACQUISITION", "NEW_FAMILY_MEMBER_IN_MANAGEMENT",
    ]);
    const strategicChangeSignals = recentSignals.filter((s) => STRATEGIC_SIGNALS.has(s.type)).length;

    const accessInfo = access.get(inst.id);
    const priorCapitalInterest =
      inst.ownershipType === "PE_BACKED" ||
      recentSignals.some((s) => s.type === "CAPITAL_RAISE" || s.type === "REFINANCING");

    const scoringInput: ScoringInput = {
      strategic: {
        marketTier: marketTier(inst.city),
        curriculum: inst.curriculum,
        students: inst.students,
        capacity: inst.capacity,
        utilisation: inst.utilisation,
        reputation: reputationFrom({
          accreditations: inst.accreditations,
          tuitionAverage: inst.tuitionAverage,
          utilisation: inst.utilisation,
          foundedYear: inst.foundedYear,
        }),
        campusCount: inst.campusCount,
        hasExpansionHeadroom: Boolean(property?.adjacentLand) || (inst.utilisation ?? 1) < 0.85,
      },
      financial: {
        revenue,
        revenueGrowth:
          latest && previous && previous.revenue
            ? (latest.revenue ?? 0) / previous.revenue - 1
            : (latest?.revenueGrowth ?? null),
        ebitda,
        ebitdaMargin: latest?.ebitdaMargin ?? null,
        capexToRevenue: latest?.capex && latest.revenue ? latest.capex / latest.revenue : null,
        predictability: 0.88,
      },
      transaction: {
        successionStatus: inst.successionStatus,
        ownershipType: inst.ownershipType,
        founderAge: inst.founderAge,
        ownershipConcentration:
          inst.ownershipType === "FOUNDER" ? 1 : inst.ownershipType === "FAMILY" ? 0.82 : 0.6,
        priorCapitalInterest,
        strategicChangeSignals,
        expansionFundingNeed:
          recentSignals.some((s) => s.type === "CAMPUS_EXPANSION" || s.type === "NEW_CAMPUS") ||
          (inst.utilisation ?? 0) > 0.9,
      },
      demand: { matchScores },
      realEstate: {
        tenure: inst.tenure,
        propertyValue: propertyValueHigh,
        enterpriseValue: evHigh || null,
        saleLeasebackCandidate: property?.tags.includes("SALE_LEASEBACK_CANDIDATE") ?? false,
        developmentPotential: property?.tags.includes("DEVELOPMENT_OPPORTUNITY") ?? false,
      },
      relationship: {
        bestStrength: accessInfo?.strength ?? 1,
        hasWarmIntroduction:
          accessInfo?.tier === "WARM_INTRODUCTION" || accessInfo?.tier === "SECOND_DEGREE",
        priorConversation: inst.interactions.length > 0,
        clientReferral: inst.opportunities.some((o) => o.stage !== "LEAD"),
      },
    };

    const score = scoreOpportunity(scoringInput, weights);
    const opportunity = inst.opportunities[0];

    return {
      id: inst.id,
      slug: inst.slug,
      name: inst.name,
      city: inst.city,
      region: inst.region,
      country: inst.country,
      type: inst.type,
      ownershipType: inst.ownershipType,
      successionStatus: inst.successionStatus,
      tenure: inst.tenure,
      students: inst.students,
      capacity: inst.capacity,
      utilisation: inst.utilisation,
      familyName: inst.familyName,
      founderAge: inst.founderAge,
      curriculum: inst.curriculum,
      latitude: inst.latitude,
      longitude: inst.longitude,
      summary: inst.summary,
      revenue,
      ebitda,
      ebitdaMargin: latest?.ebitdaMargin ?? null,
      revenueGrowth: scoringInput.financial.revenueGrowth,
      netDebt: latest?.netDebt ?? null,
      marketRent,
      propertyValueLow,
      propertyValueHigh,
      enterpriseValueLow: evLow,
      enterpriseValueHigh: evHigh,
      matchCount: activeMatches.length,
      strongMatchCount: strongMatches.length,
      bestMatchScore: matchScores.length ? Math.max(...matchScores) : 0,
      signalCount: inst.signals.length,
      recentSignalCount: recentSignals.length,
      lastInteractionAt: inst.interactions[0]?.date ?? null,
      accessTier: accessInfo?.tier ?? "COLD",
      accessNarrative: accessInfo?.best?.narrative ?? null,
      relationshipStrength: accessInfo?.strength ?? 1,
      score,
      displayScore: inst.scoreOverride?.score ?? score.total,
      overridden: Boolean(inst.scoreOverride),
      overrideRationale: inst.scoreOverride?.rationale ?? null,
      hasOpportunity: inst.opportunities.length > 0,
      opportunityStage: opportunity?.stage ?? null,
      riskCount: inst.riskFlags.length,
    };
  });
});

export async function scoredInstitutionBySlug(slug: string): Promise<ScoredInstitution | null> {
  const all = await scoreUniverse();
  return all.find((i) => i.slug === slug) ?? null;
}
