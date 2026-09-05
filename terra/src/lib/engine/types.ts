/**
 * Shared shapes for Terra's analytical engines.
 *
 * Every engine returns not just a number but the workings behind it. A score
 * without an explanation is not usable in an investment committee.
 */

export interface DimensionResult {
  key: string;
  label: string;
  /** Weight applied, 0..1. */
  weight: number;
  /** Raw dimension score, 0..100. */
  raw: number;
  /** raw × weight — contribution to the headline number. */
  weighted: number;
  /** Plain-language reasons a partner can read aloud. */
  drivers: string[];
  /** Things that argue against. Never hidden. */
  detractors: string[];
}

export interface ScoreResult {
  total: number;
  dimensions: DimensionResult[];
  /** Evidence lines shown under the score. */
  evidence: string[];
  /** Fields that were unknown and defaulted — honesty about what we don't know. */
  gaps: string[];
}

export const RELATIONSHIP_LABELS: Record<number, string> = {
  1: "No relationship",
  2: "Weak",
  3: "Known",
  4: "Warm",
  5: "Trusted",
};

export function bounded(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** Linear interpolation of a value into a 0..100 band. */
export function band(value: number, worst: number, best: number): number {
  if (!Number.isFinite(value)) return 0;
  if (best === worst) return 50;
  return bounded(((value - worst) / (best - worst)) * 100);
}

/** Distance-from-ideal scoring, used where both too-small and too-large are bad. */
export function fitWithin(
  value: number,
  min: number | null | undefined,
  max: number | null | undefined,
  tolerance = 0.35,
): number {
  if (min == null && max == null) return 70; // no stated constraint — neutral-positive
  const lo = min ?? -Infinity;
  const hi = max ?? Infinity;
  if (value >= lo && value <= hi) return 100;
  const anchor = value < lo ? lo : hi;
  if (!Number.isFinite(anchor) || anchor === 0) return 0;
  const miss = Math.abs(value - anchor) / Math.abs(anchor);
  return bounded(100 * (1 - miss / tolerance));
}

export function round(value: number, places = 0): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}
