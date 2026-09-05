/**
 * VALUATION — ranges, never false precision, and every assumption on screen.
 * Sum-of-the-parts is the default posture: an education asset is an operating
 * business and, often, a separable property.
 */

import { round } from "./types";

export interface ValuationRange {
  low: number;
  high: number;
}

export interface ComparableInput {
  target: string;
  buyer: string;
  country: string;
  date: Date | string;
  segment: string;
  evEbitda: number | null;
  evRevenue: number | null;
  realEstateIncluded: boolean;
}

export interface CompSetStats {
  count: number;
  evEbitda: { low: number; median: number; high: number } | null;
  evRevenue: { low: number; median: number; high: number } | null;
}

function quartiles(values: number[]): { low: number; median: number; high: number } | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const at = (q: number) => {
    const idx = (s.length - 1) * q;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const w = idx - lo;
    return s[lo]! * (1 - w) + s[hi]! * w;
  };
  return { low: round(at(0.25), 2), median: round(at(0.5), 2), high: round(at(0.75), 2) };
}

/** Interquartile band of a comparable set — the honest way to read 15 deals. */
export function compSetStats(comps: ComparableInput[]): CompSetStats {
  return {
    count: comps.length,
    evEbitda: quartiles(comps.map((c) => c.evEbitda).filter((v): v is number => v != null && v > 0)),
    evRevenue: quartiles(comps.map((c) => c.evRevenue).filter((v): v is number => v != null && v > 0)),
  };
}

export function evFromMultiple(metric: number, low: number, high: number): ValuationRange {
  return { low: round(metric * low), high: round(metric * high) };
}

export interface DcfInput {
  cashFlows: number[];
  discountRate: number;
  terminalGrowth: number;
  netDebt: number;
}

/** Mid-year convention omitted deliberately — this is an indicative cross-check. */
export function dcf(input: DcfInput): { enterpriseValue: number; equityValue: number; terminalValue: number; pvExplicit: number } {
  const { cashFlows, discountRate, terminalGrowth, netDebt } = input;
  if (discountRate <= terminalGrowth) {
    throw new Error("Discount rate must exceed terminal growth");
  }
  let pvExplicit = 0;
  cashFlows.forEach((cf, i) => {
    pvExplicit += cf / (1 + discountRate) ** (i + 1);
  });
  const finalCf = cashFlows[cashFlows.length - 1] ?? 0;
  const terminalValue = (finalCf * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  const pvTerminal = terminalValue / (1 + discountRate) ** cashFlows.length;
  const enterpriseValue = pvExplicit + pvTerminal;
  return {
    enterpriseValue: round(enterpriseValue),
    equityValue: round(enterpriseValue - netDebt),
    terminalValue: round(terminalValue),
    pvExplicit: round(pvExplicit),
  };
}

export interface PropertyValuationInput {
  /** Passing or estimated market rent. */
  marketRent: number;
  /** Net initial yield the institutional market would apply. */
  yieldLow: number;
  yieldHigh: number;
  /** Fallback when no rent is estimable. */
  builtAreaSqm?: number | null;
  valuePerSqmLow?: number | null;
  valuePerSqmHigh?: number | null;
}

export function valueProperty(input: PropertyValuationInput): ValuationRange | null {
  if (input.marketRent > 0 && input.yieldHigh > 0 && input.yieldLow > 0) {
    // A lower yield produces a higher value.
    return {
      low: round(input.marketRent / input.yieldHigh),
      high: round(input.marketRent / input.yieldLow),
    };
  }
  if (input.builtAreaSqm && input.valuePerSqmLow && input.valuePerSqmHigh) {
    return {
      low: round(input.builtAreaSqm * input.valuePerSqmLow),
      high: round(input.builtAreaSqm * input.valuePerSqmHigh),
    };
  }
  return null;
}

export interface SumOfPartsInput {
  opco: ValuationRange | null;
  propco: ValuationRange | null;
  netDebt?: number;
}

export function sumOfTheParts(input: SumOfPartsInput): {
  opco: ValuationRange | null;
  propco: ValuationRange | null;
  combined: ValuationRange | null;
  equity: ValuationRange | null;
} {
  const combined =
    input.opco || input.propco
      ? {
          low: round((input.opco?.low ?? 0) + (input.propco?.low ?? 0)),
          high: round((input.opco?.high ?? 0) + (input.propco?.high ?? 0)),
        }
      : null;
  const netDebt = input.netDebt ?? 0;
  return {
    opco: input.opco,
    propco: input.propco,
    combined,
    equity: combined ? { low: round(combined.low - netDebt), high: round(combined.high - netDebt) } : null,
  };
}

/**
 * When a school owns its campus, reported EBITDA carries no rent. Any buyer
 * pricing the OpCo alone must first charge a market rent against it.
 */
export function rentAdjustedEbitda(ebitda: number, marketRent: number): number {
  return round(ebitda - marketRent);
}

export function blendRanges(ranges: (ValuationRange | null)[], weights?: number[]): ValuationRange | null {
  const present = ranges
    .map((r, i) => ({ r, w: weights?.[i] ?? 1 }))
    .filter((x): x is { r: ValuationRange; w: number } => x.r !== null);
  if (present.length === 0) return null;
  const totalWeight = present.reduce((a, b) => a + b.w, 0);
  return {
    low: round(present.reduce((a, b) => a + b.r.low * b.w, 0) / totalWeight),
    high: round(present.reduce((a, b) => a + b.r.high * b.w, 0) / totalWeight),
  };
}
