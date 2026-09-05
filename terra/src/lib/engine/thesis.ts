/**
 * TRANSACTION THESIS — "Find Opportunity".
 *
 * Composes everything Terra knows about one institution into a recommended
 * transaction thesis, the counterparties that fit it, and the route into the
 * room. It is a recommendation, not a decision: the rationale is always shown.
 */

import type { ScoreResult } from "./types";
import type { MatchResult } from "./matching";
import type { StructureOutcome, StructureType } from "./structures";
import type { LegacyFitResult } from "./legacy";
import type { AccessTier, IntroductionPath } from "./graph";
import { ACCESS_LABELS } from "./graph";
import { round } from "./types";

export interface ThesisInput {
  institutionName: string;
  city: string | null;
  ownershipType: string;
  successionStatus: string;
  tenure: string;
  founderAge: number | null;
  utilisation: number | null;
  score: ScoreResult;
  structures: StructureOutcome[];
  legacyFit: LegacyFitResult[];
  /** Buyers for the operating business. */
  opcoMatches: (MatchResult & { organisationName: string })[];
  /** Institutional owners for the property. */
  propcoMatches: (MatchResult & { organisationName: string })[];
  bestPath: IntroductionPath | null;
  accessTier: AccessTier;
  opcoValuation: { low: number; high: number } | null;
  propcoValuation: { low: number; high: number } | null;
  recentSignals: { headline: string; date: Date | string }[];
  /** Risk flags already recorded against the asset. */
  riskFlags: { type: string; severity: string; rationale: string }[];
}

export interface Thesis {
  /** One sentence a partner could say out loud. */
  headline: string;
  recommendedStructure: StructureType;
  recommendedStructureLabel: string;
  /** Why this structure and not the obvious one. */
  rationale: string[];
  /** Where the thesis is weak. Never omitted. */
  risks: string[];
  structureEconomics: {
    opcoLow: number | null;
    opcoHigh: number | null;
    propcoLow: number | null;
    propcoHigh: number | null;
    founderProceeds: number;
    stakeRetained: number;
  };
  counterparties: {
    opco: { name: string; score: number }[];
    propco: { name: string; score: number }[];
  };
  access: {
    tier: AccessTier;
    label: string;
    narrative: string | null;
  };
  nextBestAction: string;
  confidence: "HIGH" | "MODERATE" | "EXPLORATORY";
}

function pickStructure(input: ThesisInput): StructureType {
  const owned = input.tenure === "OWNED" || input.tenure === "MIXED";
  const founderLed = ["FOUNDER", "FAMILY"].includes(input.ownershipType);
  const succession =
    input.successionStatus === "POTENTIAL_SUCCESSION_ISSUE" ||
    input.successionStatus === "TRANSITION_UNDERWAY";
  const nextGenActive = input.successionStatus === "NEXT_GENERATION_ACTIVE";

  // Where the founder has no successor and does not want to stay, a clean sale
  // is the honest answer even though it scores worst on legacy.
  if (founderLed && succession && !owned) return "FULL_SALE";
  if (founderLed && succession && owned) return "MAJORITY_PARTNERSHIP";
  if (founderLed && nextGenActive && owned) return "SALE_LEASEBACK";
  if (founderLed && nextGenActive) return "MINORITY_GROWTH";
  if (!founderLed && owned) return "PROPCO_SALE";
  if (input.ownershipType === "PE_BACKED") return "FULL_SALE";
  return owned ? "MAJORITY_PARTNERSHIP" : "FULL_SALE";
}

export function buildThesis(input: ThesisInput): Thesis {
  const structureType = pickStructure(input);
  const structure =
    input.structures.find((s) => s.type === structureType) ?? input.structures[0]!;
  const legacy = input.legacyFit.find((l) => l.type === structureType);

  const rationale: string[] = [];
  const risks: string[] = [];

  const owned = input.tenure === "OWNED" || input.tenure === "MIXED";

  if (structureType === "MAJORITY_PARTNERSHIP") {
    rationale.push("The family retains meaningful involvement and a second bite at value.");
    rationale.push("The institution receives growth capital without a change of identity.");
    rationale.push("The founder takes substantial liquidity now rather than all of it at once.");
    if (owned) rationale.push("Campus ownership can be monetised separately from the operating company.");
    risks.push(
      "The retained minority becomes illiquid and its value depends on the investor's exit, not the family's timing.",
    );
  } else if (structureType === "SALE_LEASEBACK") {
    rationale.push("Liquidity is available without selling any part of the school itself.");
    rationale.push("The next generation continues to run the institution unchanged.");
    rationale.push("An institutional landlord underwrites the campus on a long indexed lease.");
    risks.push("A permanent rent line reduces reported EBITDA and constrains future flexibility.");
    risks.push("Institutional buyers want 20–25 year terms; families rarely want to commit that far.");
  } else if (structureType === "FULL_SALE") {
    rationale.push("Ownership has no evident continuity plan; a clean transfer is the simplest outcome.");
    rationale.push("A single process captures the full value of both the operations and the estate.");
    risks.push("No residual family involvement — legacy considerations must be negotiated into the SPA.");
  } else if (structureType === "PROPCO_SALE") {
    rationale.push("The operating institution continues under existing management.");
    rationale.push("Only the freehold changes hands, releasing capital held in the estate.");
    risks.push("The school takes on a rent it has never paid; covenant headroom has to be proven.");
  } else if (structureType === "MINORITY_GROWTH") {
    rationale.push("Capital funds expansion while control and identity stay with the family.");
    risks.push("Minority positions require carefully drafted governance and exit rights.");
  }

  if (input.utilisation !== null && input.utilisation >= 0.9) {
    rationale.push(
      `At ${Math.round(input.utilisation * 100)}% utilisation, further growth requires capital rather than marketing.`,
    );
  }
  if (input.founderAge && input.founderAge >= 65) {
    rationale.push(`The founder is ${input.founderAge}; the timing question is already live.`);
  }

  const opco = input.opcoMatches.filter((m) => !m.disqualified).slice(0, 5);
  const propco = input.propcoMatches.filter((m) => !m.disqualified).slice(0, 4);

  if (opco.length >= 2) {
    rationale.push(
      `${opco.length} active buyer mandates currently fit the operating business.`,
    );
  } else if (opco.length === 0) {
    risks.push("No active mandate currently fits — a buyer universe would need to be built.");
  }
  if (owned && propco.length === 0) {
    risks.push("No institutional property buyer is currently mandated for this geography.");
  }

  // Risks already recorded against the asset belong here too — the thesis must
  // not read as clean while the profile carries high-severity flags.
  for (const flag of input.riskFlags) {
    if (flag.severity === "HIGH" || flag.severity === "CRITICAL") {
      risks.push(flag.rationale);
    }
  }

  if (input.accessTier === "COLD") {
    risks.push("Terra has no warm route to ownership today. An introduction has to be manufactured.");
  }
  if (input.score.gaps.length > 0) {
    risks.push(`Data gaps remain: ${input.score.gaps.slice(0, 3).join("; ").toLowerCase()}.`);
  }

  const headline = buildHeadline(structureType, input, owned);

  const nextBestAction = buildNextAction(input);

  const confidence: Thesis["confidence"] =
    input.score.total >= 78 && opco.length >= 2 && input.accessTier !== "COLD"
      ? "HIGH"
      : input.score.total >= 60
        ? "MODERATE"
        : "EXPLORATORY";

  return {
    headline,
    recommendedStructure: structureType,
    recommendedStructureLabel: structure.label,
    rationale,
    risks,
    structureEconomics: {
      opcoLow: input.opcoValuation?.low ?? null,
      opcoHigh: input.opcoValuation?.high ?? null,
      propcoLow: input.propcoValuation?.low ?? null,
      propcoHigh: input.propcoValuation?.high ?? null,
      founderProceeds: structure.founderProceeds,
      stakeRetained: round(structure.stakeRetained, 2),
    },
    counterparties: {
      opco: opco.map((m) => ({ name: m.organisationName, score: m.score })),
      propco: propco.map((m) => ({ name: m.organisationName, score: m.score })),
    },
    access: {
      tier: input.accessTier,
      label: ACCESS_LABELS[input.accessTier],
      narrative: input.bestPath?.narrative ?? null,
    },
    nextBestAction,
    confidence: legacy && legacy.legacyPreservation < 40 && confidence === "HIGH"
      ? "MODERATE"
      : confidence,
  };
}

function buildHeadline(type: StructureType, input: ThesisInput, owned: boolean): string {
  switch (type) {
    case "MAJORITY_PARTNERSHIP":
      return owned
        ? "Potential majority partnership with separate PropCo monetisation."
        : "Potential majority partnership with the founder retaining a minority stake.";
    case "SALE_LEASEBACK":
      return "Potential sale-and-leaseback releasing campus value while the family continues to operate.";
    case "FULL_SALE":
      return "Potential full sale of the operating company and campus in a single process.";
    case "PROPCO_SALE":
      return "Potential PropCo separation with the institution continuing under a long lease.";
    case "MINORITY_GROWTH":
      return "Potential minority growth investment funding campus expansion.";
    case "OPCO_SALE":
      return "Potential OpCo sale with the family retaining the campus as a rental asset.";
    case "RECAPITALISATION":
      return "Potential recapitalisation providing founder liquidity without a change of ownership.";
    case "JV_EXPANSION":
      return "Potential expansion joint venture funding new campuses alongside the founder.";
  }
}

function buildNextAction(input: ThesisInput): string {
  if (input.bestPath && input.bestPath.degree >= 1) {
    const names = input.bestPath.steps.map((s) => s.node.label);
    const first = names[0] ?? "Terra";
    const via = names.slice(1, -1);
    const target = names[names.length - 1] ?? input.institutionName;
    if (via.length > 0) {
      return `${first} → ${via.join(" → ")} → introduction to ${target}`;
    }
    return `${first} → direct approach to ${target}`;
  }
  if (input.accessTier === "COLD") {
    return `Identify a route to ${input.institutionName} — advisers, landlords or peer founders before any direct approach`;
  }
  return `Request a confidential founder meeting at ${input.institutionName}`;
}
