/**
 * FOUNDER LEGACY FIT.
 *
 * Founder-owned schools are rarely decided on price alone. This scores each
 * structure against what the founder actually said they want, and reports two
 * numbers side by side: financial outcome, and legacy preservation.
 */

import { bounded, round } from "./types";
import type { StructureOutcome, StructureType } from "./structures";

export type FounderObjective =
  | "MAXIMUM_VALUATION"
  | "PARTIAL_LIQUIDITY"
  | "MAINTAIN_NAME"
  | "MAINTAIN_CURRICULUM"
  | "FAMILY_INVOLVEMENT"
  | "EMPLOYEE_CONTINUITY"
  | "REAL_ESTATE_RETENTION"
  | "REMAIN_CHAIRMAN"
  | "GROWTH_CAPITAL"
  | "LONG_TERM_STEWARDSHIP";

export const OBJECTIVE_LABELS: Record<FounderObjective, string> = {
  MAXIMUM_VALUATION: "Maximum valuation",
  PARTIAL_LIQUIDITY: "Partial liquidity",
  MAINTAIN_NAME: "Maintain the school's name",
  MAINTAIN_CURRICULUM: "Maintain the curriculum",
  FAMILY_INVOLVEMENT: "Continued family involvement",
  EMPLOYEE_CONTINUITY: "Employee continuity",
  REAL_ESTATE_RETENTION: "Retain the real estate",
  REMAIN_CHAIRMAN: "Remain chairman",
  GROWTH_CAPITAL: "Growth capital for expansion",
  LONG_TERM_STEWARDSHIP: "Long-term stewardship",
};

/** How well each structure serves each objective, 0..100. Editable by design. */
const FIT: Record<StructureType, Record<FounderObjective, number>> = {
  FULL_SALE: {
    MAXIMUM_VALUATION: 100, PARTIAL_LIQUIDITY: 30, MAINTAIN_NAME: 55, MAINTAIN_CURRICULUM: 55,
    FAMILY_INVOLVEMENT: 10, EMPLOYEE_CONTINUITY: 55, REAL_ESTATE_RETENTION: 0,
    REMAIN_CHAIRMAN: 15, GROWTH_CAPITAL: 60, LONG_TERM_STEWARDSHIP: 50,
  },
  OPCO_SALE: {
    MAXIMUM_VALUATION: 72, PARTIAL_LIQUIDITY: 85, MAINTAIN_NAME: 60, MAINTAIN_CURRICULUM: 60,
    FAMILY_INVOLVEMENT: 30, EMPLOYEE_CONTINUITY: 60, REAL_ESTATE_RETENTION: 100,
    REMAIN_CHAIRMAN: 25, GROWTH_CAPITAL: 65, LONG_TERM_STEWARDSHIP: 60,
  },
  PROPCO_SALE: {
    MAXIMUM_VALUATION: 45, PARTIAL_LIQUIDITY: 88, MAINTAIN_NAME: 100, MAINTAIN_CURRICULUM: 100,
    FAMILY_INVOLVEMENT: 95, EMPLOYEE_CONTINUITY: 95, REAL_ESTATE_RETENTION: 0,
    REMAIN_CHAIRMAN: 95, GROWTH_CAPITAL: 70, LONG_TERM_STEWARDSHIP: 80,
  },
  SALE_LEASEBACK: {
    MAXIMUM_VALUATION: 48, PARTIAL_LIQUIDITY: 92, MAINTAIN_NAME: 100, MAINTAIN_CURRICULUM: 100,
    FAMILY_INVOLVEMENT: 100, EMPLOYEE_CONTINUITY: 95, REAL_ESTATE_RETENTION: 5,
    REMAIN_CHAIRMAN: 100, GROWTH_CAPITAL: 78, LONG_TERM_STEWARDSHIP: 82,
  },
  MAJORITY_PARTNERSHIP: {
    MAXIMUM_VALUATION: 82, PARTIAL_LIQUIDITY: 95, MAINTAIN_NAME: 85, MAINTAIN_CURRICULUM: 82,
    FAMILY_INVOLVEMENT: 88, EMPLOYEE_CONTINUITY: 80, REAL_ESTATE_RETENTION: 35,
    REMAIN_CHAIRMAN: 75, GROWTH_CAPITAL: 92, LONG_TERM_STEWARDSHIP: 78,
  },
  MINORITY_GROWTH: {
    MAXIMUM_VALUATION: 40, PARTIAL_LIQUIDITY: 35, MAINTAIN_NAME: 95, MAINTAIN_CURRICULUM: 92,
    FAMILY_INVOLVEMENT: 98, EMPLOYEE_CONTINUITY: 92, REAL_ESTATE_RETENTION: 85,
    REMAIN_CHAIRMAN: 95, GROWTH_CAPITAL: 100, LONG_TERM_STEWARDSHIP: 88,
  },
  RECAPITALISATION: {
    MAXIMUM_VALUATION: 42, PARTIAL_LIQUIDITY: 80, MAINTAIN_NAME: 100, MAINTAIN_CURRICULUM: 100,
    FAMILY_INVOLVEMENT: 100, EMPLOYEE_CONTINUITY: 90, REAL_ESTATE_RETENTION: 95,
    REMAIN_CHAIRMAN: 100, GROWTH_CAPITAL: 45, LONG_TERM_STEWARDSHIP: 70,
  },
  JV_EXPANSION: {
    MAXIMUM_VALUATION: 35, PARTIAL_LIQUIDITY: 20, MAINTAIN_NAME: 92, MAINTAIN_CURRICULUM: 90,
    FAMILY_INVOLVEMENT: 95, EMPLOYEE_CONTINUITY: 90, REAL_ESTATE_RETENTION: 90,
    REMAIN_CHAIRMAN: 92, GROWTH_CAPITAL: 100, LONG_TERM_STEWARDSHIP: 85,
  },
};

/** Objectives that speak to legacy rather than to money. */
const LEGACY_OBJECTIVES: FounderObjective[] = [
  "MAINTAIN_NAME",
  "MAINTAIN_CURRICULUM",
  "FAMILY_INVOLVEMENT",
  "EMPLOYEE_CONTINUITY",
  "REMAIN_CHAIRMAN",
  "LONG_TERM_STEWARDSHIP",
];

export interface RankedObjective {
  objective: FounderObjective;
  /** 1 = most important. */
  rank: number;
}

export interface LegacyFitResult {
  type: StructureType;
  label: string;
  /** 0..100 — proceeds relative to the best structure on the table. */
  financialOutcome: number;
  /** 0..100 — weighted fit against the founder's legacy objectives. */
  legacyPreservation: number;
  /** 0..100 — weighted fit against everything the founder ranked. */
  objectiveFit: number;
  perObjective: { objective: FounderObjective; label: string; fit: number; weight: number }[];
}

/** Rank 1 carries the most weight; weights decay linearly and are normalised. */
function weightsFor(objectives: RankedObjective[]): Map<FounderObjective, number> {
  const n = objectives.length;
  const raw = objectives.map((o) => ({ objective: o.objective, w: Math.max(1, n - o.rank + 1) }));
  const total = raw.reduce((a, b) => a + b.w, 0) || 1;
  return new Map(raw.map((r) => [r.objective, r.w / total]));
}

export function evaluateStructuresAgainstObjectives(
  outcomes: StructureOutcome[],
  objectives: RankedObjective[],
): LegacyFitResult[] {
  const weights = weightsFor(objectives);
  // Financial outcome is relative: the best structure on this table scores 100.
  const best = Math.max(
    ...outcomes.map((o) => o.founderProceeds + o.secondExitProceeds * 0.6),
    1,
  );

  return outcomes.map((outcome) => {
    const table = FIT[outcome.type];
    const perObjective = objectives.map((o) => ({
      objective: o.objective,
      label: OBJECTIVE_LABELS[o.objective],
      fit: table[o.objective],
      weight: round(weights.get(o.objective) ?? 0, 3),
    }));

    const objectiveFit = perObjective.reduce((acc, p) => acc + p.fit * p.weight, 0);

    const legacyWeights = LEGACY_OBJECTIVES.map((l) => weights.get(l) ?? 0);
    const legacyTotal = legacyWeights.reduce((a, b) => a + b, 0);
    const legacyPreservation =
      legacyTotal > 0
        ? LEGACY_OBJECTIVES.reduce(
            (acc, l) => acc + table[l] * ((weights.get(l) ?? 0) / legacyTotal),
            0,
          )
        : LEGACY_OBJECTIVES.reduce((acc, l) => acc + table[l], 0) / LEGACY_OBJECTIVES.length;

    const financialOutcome =
      (outcome.founderProceeds + outcome.secondExitProceeds * 0.6) / best * 100;

    return {
      type: outcome.type,
      label: outcome.label,
      financialOutcome: round(bounded(financialOutcome)),
      legacyPreservation: round(bounded(legacyPreservation)),
      objectiveFit: round(bounded(objectiveFit)),
      perObjective,
    };
  });
}
