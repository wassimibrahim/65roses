/**
 * TERRA OPPORTUNITY SCORE™ — 0–100.
 *
 * This is not objective truth. It is a structured, weighted reading of what
 * Terra knows, and every point is traceable to a driver. Weights are
 * configurable; partners may override the result entirely (with rationale).
 */

import { band, bounded, type DimensionResult, type ScoreResult, round } from "./types";

export interface ScoringWeights {
  strategic: number;
  financial: number;
  transactionLikelihood: number;
  buyerDemand: number;
  realEstate: number;
  relationship: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  strategic: 0.2,
  financial: 0.2,
  transactionLikelihood: 0.2,
  buyerDemand: 0.15,
  realEstate: 0.1,
  relationship: 0.15,
};

export const WEIGHT_LABELS: Record<keyof ScoringWeights, string> = {
  strategic: "Strategic attractiveness",
  financial: "Financial quality",
  transactionLikelihood: "Transaction likelihood",
  buyerDemand: "Buyer demand",
  realEstate: "Real-estate optionality",
  relationship: "Terra relationship advantage",
};

export type SuccessionStatus =
  | "UNKNOWN"
  | "FOUNDER_LED"
  | "NEXT_GENERATION_ACTIVE"
  | "PROFESSIONAL_MANAGEMENT"
  | "POTENTIAL_SUCCESSION_ISSUE"
  | "TRANSITION_UNDERWAY";

export type OwnershipType =
  | "FOUNDER"
  | "FAMILY"
  | "FOUNDATION"
  | "RELIGIOUS"
  | "INSTITUTIONAL"
  | "PE_BACKED"
  | "OPERATOR"
  | "GOVERNMENT"
  | "UNKNOWN";

export type Tenure = "OWNED" | "LEASED" | "MIXED" | "UNKNOWN";

export interface ScoringInput {
  strategic: {
    /** Tier of the catchment market: 1 = prime metro, 2 = strong secondary, 3 = other. */
    marketTier: 1 | 2 | 3;
    /** International / IB / bilingual curricula carry structural buyer demand. */
    curriculum: string[];
    students: number | null;
    capacity: number | null;
    utilisation: number | null;
    /** 0..100 qualitative reputation read, from research. */
    reputation: number | null;
    /** Multi-campus or land headroom implies scalability. */
    campusCount: number;
    hasExpansionHeadroom: boolean;
  };
  financial: {
    revenue: number | null;
    revenueGrowth: number | null;
    ebitda: number | null;
    ebitdaMargin: number | null;
    capexToRevenue: number | null;
    /** Enrolment-backed revenue is predictable; 0..1. */
    predictability: number | null;
  };
  transaction: {
    successionStatus: SuccessionStatus;
    ownershipType: OwnershipType;
    founderAge: number | null;
    /** Largest single stake, 0..1. Concentration makes a deal executable. */
    ownershipConcentration: number | null;
    priorCapitalInterest: boolean;
    /** Count of strategic-change signals in the last 24 months. */
    strategicChangeSignals: number;
    expansionFundingNeed: boolean;
  };
  demand: {
    /** Match scores against currently active mandates, 0..100 each. */
    matchScores: number[];
  };
  realEstate: {
    tenure: Tenure;
    propertyValue: number | null;
    enterpriseValue: number | null;
    saleLeasebackCandidate: boolean;
    developmentPotential: boolean;
  };
  relationship: {
    /** Best known path strength to ownership, 1..5. */
    bestStrength: number;
    hasWarmIntroduction: boolean;
    priorConversation: boolean;
    clientReferral: boolean;
  };
}

const PREMIUM_CURRICULA = ["IB", "British", "American", "Bilingual", "International"];

function strategicDimension(input: ScoringInput["strategic"], gaps: string[]): DimensionResult {
  const drivers: string[] = [];
  const detractors: string[] = [];

  const marketScore = { 1: 100, 2: 72, 3: 45 }[input.marketTier];
  if (input.marketTier === 1) drivers.push("Prime metropolitan catchment");
  if (input.marketTier === 3) detractors.push("Secondary catchment limits buyer set");

  const premium = input.curriculum.filter((c) =>
    PREMIUM_CURRICULA.some((p) => c.toLowerCase().includes(p.toLowerCase())),
  );
  const curriculumScore = premium.length > 0 ? Math.min(100, 70 + premium.length * 15) : 50;
  if (premium.length > 0) drivers.push(`${premium.join(" / ")} curriculum attracts international buyers`);

  const util = input.utilisation ?? (input.students && input.capacity ? input.students / input.capacity : null);
  let demandScore = 50;
  if (util === null) {
    gaps.push("Utilisation unknown — demand read is provisional");
  } else if (util >= 0.92) {
    demandScore = 96;
    drivers.push(`Effectively full at ${Math.round(util * 100)}% utilisation`);
    detractors.push("Limited organic headroom without capex");
  } else if (util >= 0.8) {
    demandScore = 88;
    drivers.push(`${Math.round(util * 100)}% utilisation with residual headroom`);
  } else if (util >= 0.6) {
    demandScore = 62;
  } else {
    demandScore = 34;
    detractors.push(`Utilisation of ${Math.round(util * 100)}% suggests demand weakness`);
  }

  const reputation = input.reputation ?? 60;
  if (input.reputation === null) gaps.push("Reputation not yet assessed");

  let scalability = 40;
  if (input.campusCount > 1) {
    scalability += Math.min(30, input.campusCount * 10);
    drivers.push(`${input.campusCount} campuses — platform characteristics`);
  }
  if (input.hasExpansionHeadroom) {
    scalability += 25;
    drivers.push("Physical headroom for enrolment expansion");
  }
  scalability = bounded(scalability);

  const raw =
    marketScore * 0.28 +
    curriculumScore * 0.2 +
    demandScore * 0.24 +
    reputation * 0.16 +
    scalability * 0.12;

  return {
    key: "strategic",
    label: WEIGHT_LABELS.strategic,
    weight: 0,
    raw: bounded(raw),
    weighted: 0,
    drivers,
    detractors,
  };
}

function financialDimension(input: ScoringInput["financial"], gaps: string[]): DimensionResult {
  const drivers: string[] = [];
  const detractors: string[] = [];

  if (input.revenue === null) gaps.push("No revenue figure — financial quality is estimated");

  const growth = input.revenueGrowth;
  let growthScore = 50;
  if (growth !== null) {
    growthScore = band(growth, -0.05, 0.18);
    if (growth >= 0.08) drivers.push(`Revenue growing ${Math.round(growth * 100)}% p.a.`);
    if (growth < 0) detractors.push("Revenue declining");
  } else {
    gaps.push("Revenue growth unknown");
  }

  const marginRaw = input.ebitdaMargin ?? (input.ebitda && input.revenue ? input.ebitda / input.revenue : null);
  let marginScore = 50;
  if (marginRaw !== null) {
    marginScore = band(marginRaw, 0.05, 0.32);
    if (marginRaw >= 0.25) drivers.push(`EBITDA margin of ${Math.round(marginRaw * 100)}%`);
    if (marginRaw < 0.12) detractors.push(`Thin ${Math.round(marginRaw * 100)}% EBITDA margin`);
  } else {
    gaps.push("EBITDA margin unknown");
  }

  const capex = input.capexToRevenue;
  let capexScore = 60;
  if (capex !== null) {
    capexScore = band(capex, 0.12, 0.02);
    if (capex > 0.09) detractors.push(`Capex running at ${Math.round(capex * 100)}% of revenue`);
    if (capex <= 0.04) drivers.push("Low maintenance capex intensity");
  }

  const predictability = input.predictability ?? 0.75;
  if (predictability >= 0.85) drivers.push("Enrolment-backed, highly predictable revenue");

  const cashScore = bounded(marginScore * 0.6 + capexScore * 0.4);

  const raw =
    growthScore * 0.28 +
    marginScore * 0.3 +
    cashScore * 0.18 +
    predictability * 100 * 0.14 +
    capexScore * 0.1;

  return {
    key: "financial",
    label: WEIGHT_LABELS.financial,
    weight: 0,
    raw: bounded(raw),
    weighted: 0,
    drivers,
    detractors,
  };
}

const SUCCESSION_SCORE: Record<SuccessionStatus, number> = {
  POTENTIAL_SUCCESSION_ISSUE: 96,
  TRANSITION_UNDERWAY: 90,
  FOUNDER_LED: 72,
  PROFESSIONAL_MANAGEMENT: 58,
  NEXT_GENERATION_ACTIVE: 46,
  UNKNOWN: 40,
};

const OWNERSHIP_SCORE: Record<OwnershipType, number> = {
  FOUNDER: 92,
  FAMILY: 84,
  PE_BACKED: 76, // a fund has a clock
  OPERATOR: 52,
  FOUNDATION: 34,
  RELIGIOUS: 30,
  INSTITUTIONAL: 44,
  GOVERNMENT: 8,
  UNKNOWN: 40,
};

function transactionDimension(
  input: ScoringInput["transaction"],
  gaps: string[],
): DimensionResult {
  const drivers: string[] = [];
  const detractors: string[] = [];

  const successionScore = SUCCESSION_SCORE[input.successionStatus];
  if (input.successionStatus === "POTENTIAL_SUCCESSION_ISSUE")
    drivers.push("Succession question unresolved");
  if (input.successionStatus === "TRANSITION_UNDERWAY") drivers.push("Ownership transition already underway");
  if (input.successionStatus === "NEXT_GENERATION_ACTIVE")
    detractors.push("Next generation active in the business — lower urgency");
  if (input.successionStatus === "UNKNOWN") gaps.push("Succession status not established");

  const ownershipScore = OWNERSHIP_SCORE[input.ownershipType];
  if (input.ownershipType === "GOVERNMENT") detractors.push("Public ownership — not transactable");

  let ageScore = 45;
  if (input.founderAge !== null) {
    ageScore = band(input.founderAge, 45, 72);
    if (input.founderAge >= 65) drivers.push(`Founder is ${input.founderAge}`);
  } else {
    gaps.push("Founder age not publicly known");
  }

  const concentration = input.ownershipConcentration;
  let concentrationScore = 55;
  if (concentration !== null) {
    concentrationScore = band(concentration, 0.25, 0.9);
    if (concentration >= 0.75) drivers.push("Concentrated ownership — a single decision-maker");
    if (concentration < 0.4) detractors.push("Fragmented ownership complicates execution");
  }

  const capitalScore = input.priorCapitalInterest ? 90 : 45;
  if (input.priorCapitalInterest) drivers.push("Has previously engaged with institutional capital");

  const signalScore = bounded(40 + input.strategicChangeSignals * 18);
  if (input.strategicChangeSignals > 0)
    drivers.push(
      `${input.strategicChangeSignals} strategic-change signal${input.strategicChangeSignals > 1 ? "s" : ""} in the last 24 months`,
    );

  const fundingScore = input.expansionFundingNeed ? 85 : 45;
  if (input.expansionFundingNeed) drivers.push("Expansion plans imply an external funding need");

  const raw =
    successionScore * 0.26 +
    ownershipScore * 0.18 +
    ageScore * 0.12 +
    concentrationScore * 0.14 +
    capitalScore * 0.1 +
    signalScore * 0.12 +
    fundingScore * 0.08;

  return {
    key: "transactionLikelihood",
    label: WEIGHT_LABELS.transactionLikelihood,
    weight: 0,
    raw: bounded(raw),
    weighted: 0,
    drivers,
    detractors,
  };
}

function buyerDemandDimension(input: ScoringInput["demand"]): DimensionResult {
  const drivers: string[] = [];
  const detractors: string[] = [];

  const sorted = [...input.matchScores].sort((a, b) => b - a);
  const strong = sorted.filter((s) => s >= 70);
  const best = sorted[0] ?? 0;

  if (strong.length === 0) {
    detractors.push("No active mandate currently clears a 70 fit threshold");
  } else {
    drivers.push(
      `${strong.length} active mandate${strong.length > 1 ? "s" : ""} above 70 fit (best ${Math.round(best)})`,
    );
  }

  // Depth of demand matters as much as the single best fit.
  const depth = bounded(strong.length * 22);
  const quality = bounded(best);
  const secondary = bounded(sorted[1] ?? 0);

  const raw = quality * 0.5 + depth * 0.3 + secondary * 0.2;

  return {
    key: "buyerDemand",
    label: WEIGHT_LABELS.buyerDemand,
    weight: 0,
    raw: bounded(raw),
    weighted: 0,
    drivers,
    detractors,
  };
}

function realEstateDimension(input: ScoringInput["realEstate"], gaps: string[]): DimensionResult {
  const drivers: string[] = [];
  const detractors: string[] = [];

  let ownershipScore = 30;
  if (input.tenure === "OWNED") {
    ownershipScore = 100;
    drivers.push("Campus owned outright");
  } else if (input.tenure === "MIXED") {
    ownershipScore = 68;
    drivers.push("Mixed tenure — partial property optionality");
  } else if (input.tenure === "LEASED") {
    ownershipScore = 12;
    detractors.push("Leased estate — no PropCo to monetise");
  } else {
    gaps.push("Campus tenure not confirmed");
    ownershipScore = 35;
  }

  let weightScore = 40;
  if (input.propertyValue && input.enterpriseValue && input.enterpriseValue > 0) {
    const share = input.propertyValue / input.enterpriseValue;
    weightScore = band(share, 0.05, 0.7);
    drivers.push(`Property represents c.${Math.round(share * 100)}% of combined value`);
  } else if (input.propertyValue) {
    weightScore = 65;
  } else if (input.tenure === "OWNED") {
    gaps.push("Owned property not yet valued");
  }

  const slbScore = input.saleLeasebackCandidate ? 95 : 40;
  if (input.saleLeasebackCandidate) drivers.push("Sale-and-leaseback structurally available");

  const devScore = input.developmentPotential ? 90 : 40;
  if (input.developmentPotential) drivers.push("Development or adjacent-land potential identified");

  const raw = ownershipScore * 0.42 + weightScore * 0.24 + slbScore * 0.2 + devScore * 0.14;

  return {
    key: "realEstate",
    label: WEIGHT_LABELS.realEstate,
    weight: 0,
    raw: bounded(raw),
    weighted: 0,
    drivers,
    detractors,
  };
}

function relationshipDimension(input: ScoringInput["relationship"]): DimensionResult {
  const drivers: string[] = [];
  const detractors: string[] = [];

  const strengthScore = band(input.bestStrength, 1, 5);
  if (input.bestStrength >= 4) drivers.push("Warm or trusted route to ownership already exists");
  if (input.bestStrength <= 2) detractors.push("No meaningful relationship yet — cold approach");

  const introScore = input.hasWarmIntroduction ? 95 : 35;
  if (input.hasWarmIntroduction) drivers.push("Second-degree introduction available");

  const conversationScore = input.priorConversation ? 90 : 40;
  if (input.priorConversation) drivers.push("Terra has spoken to ownership before");

  const referralScore = input.clientReferral ? 95 : 45;
  if (input.clientReferral) drivers.push("Referred by an existing client");

  const raw =
    strengthScore * 0.4 + introScore * 0.25 + conversationScore * 0.2 + referralScore * 0.15;

  return {
    key: "relationship",
    label: WEIGHT_LABELS.relationship,
    weight: 0,
    raw: bounded(raw),
    weighted: 0,
    drivers,
    detractors,
  };
}

export function scoreOpportunity(
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoreResult {
  const gaps: string[] = [];

  const dimensions: DimensionResult[] = [
    strategicDimension(input.strategic, gaps),
    financialDimension(input.financial, gaps),
    transactionDimension(input.transaction, gaps),
    buyerDemandDimension(input.demand),
    realEstateDimension(input.realEstate, gaps),
    relationshipDimension(input.relationship),
  ];

  const weightMap: Record<string, number> = {
    strategic: weights.strategic,
    financial: weights.financial,
    transactionLikelihood: weights.transactionLikelihood,
    buyerDemand: weights.buyerDemand,
    realEstate: weights.realEstate,
    relationship: weights.relationship,
  };

  const totalWeight = Object.values(weightMap).reduce((a, b) => a + b, 0) || 1;

  let total = 0;
  for (const dim of dimensions) {
    const w = (weightMap[dim.key] ?? 0) / totalWeight;
    dim.weight = round(w, 4);
    dim.weighted = round(dim.raw * w, 2);
    dim.raw = round(dim.raw, 1);
    total += dim.weighted;
  }

  const evidence = dimensions
    .flatMap((d) => d.drivers)
    .slice(0, 8);

  return {
    total: Math.round(bounded(total)),
    dimensions,
    evidence,
    gaps: Array.from(new Set(gaps)),
  };
}
