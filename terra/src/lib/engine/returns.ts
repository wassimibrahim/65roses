/**
 * RETURNS — investor-side arithmetic. MOIC, IRR, and the two matrices that
 * actually get argued about in an investment committee.
 */

import { round } from "./types";

export interface ReturnsInput {
  entryEv: number;
  entryDebt: number;
  entryEbitda: number;
  revenueCagr: number;
  marginExpansion: number; // absolute margin points over the hold, e.g. 0.03
  entryRevenue?: number;
  holdYears: number;
  exitMultiple: number;
  exitNetDebt?: number | null;
  /** Cash swept to debt paydown over the hold, if modelled. */
  cumulativeFcf?: number;
}

export interface ReturnsResult {
  entryEv: number;
  entryEquity: number;
  entryMultiple: number;
  exitEbitda: number;
  exitEv: number;
  exitNetDebt: number;
  exitEquity: number;
  moic: number;
  irr: number;
}

export function computeReturns(input: ReturnsInput): ReturnsResult {
  const entryEquity = input.entryEv - input.entryDebt;
  const entryMultiple = input.entryEbitda > 0 ? input.entryEv / input.entryEbitda : 0;

  const entryRevenue =
    input.entryRevenue ?? (input.entryEbitda > 0 ? input.entryEbitda / 0.22 : 0);
  const entryMargin = entryRevenue > 0 ? input.entryEbitda / entryRevenue : 0;
  const exitRevenue = entryRevenue * (1 + input.revenueCagr) ** input.holdYears;
  const exitMargin = Math.max(0, entryMargin + input.marginExpansion);
  const exitEbitda = exitRevenue * exitMargin;

  const exitEv = exitEbitda * input.exitMultiple;
  const exitNetDebt =
    input.exitNetDebt ?? Math.max(0, input.entryDebt - (input.cumulativeFcf ?? 0));
  const exitEquity = exitEv - exitNetDebt;

  const moic = entryEquity > 0 ? exitEquity / entryEquity : 0;
  const irr = moic > 0 && input.holdYears > 0 ? moic ** (1 / input.holdYears) - 1 : -1;

  return {
    entryEv: round(input.entryEv),
    entryEquity: round(entryEquity),
    entryMultiple: round(entryMultiple, 2),
    exitEbitda: round(exitEbitda),
    exitEv: round(exitEv),
    exitNetDebt: round(exitNetDebt),
    exitEquity: round(exitEquity),
    moic: round(moic, 2),
    irr: round(irr, 4),
  };
}

/** Exact IRR from an arbitrary cash-flow vector (bisection — no dependencies). */
export function irrFromCashFlows(cashFlows: number[], guessLow = -0.95, guessHigh = 3): number | null {
  const npv = (rate: number) =>
    cashFlows.reduce((acc, cf, i) => acc + cf / (1 + rate) ** i, 0);

  let lo = guessLow;
  let hi = guessHigh;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (fLo * fHi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-9) return round(mid, 6);
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return round((lo + hi) / 2, 6);
}

export interface MatrixAxis {
  label: string;
  values: number[];
}

export interface SensitivityMatrix {
  rows: MatrixAxis;
  cols: MatrixAxis;
  /** [rowIndex][colIndex] */
  moic: number[][];
  irr: number[][];
}

/** Entry multiple × exit multiple. */
export function entryExitMatrix(
  base: ReturnsInput,
  entryMultiples: number[],
  exitMultiples: number[],
): SensitivityMatrix {
  const moic: number[][] = [];
  const irr: number[][] = [];
  for (const entry of entryMultiples) {
    const moicRow: number[] = [];
    const irrRow: number[] = [];
    for (const exit of exitMultiples) {
      const r = computeReturns({
        ...base,
        entryEv: base.entryEbitda * entry,
        exitMultiple: exit,
      });
      moicRow.push(r.moic);
      irrRow.push(r.irr);
    }
    moic.push(moicRow);
    irr.push(irrRow);
  }
  return {
    rows: { label: "Entry multiple", values: entryMultiples },
    cols: { label: "Exit multiple", values: exitMultiples },
    moic,
    irr,
  };
}

/** Revenue CAGR × EBITDA margin expansion. */
export function growthMarginMatrix(
  base: ReturnsInput,
  cagrs: number[],
  marginDeltas: number[],
): SensitivityMatrix {
  const moic: number[][] = [];
  const irr: number[][] = [];
  for (const g of cagrs) {
    const moicRow: number[] = [];
    const irrRow: number[] = [];
    for (const m of marginDeltas) {
      const r = computeReturns({ ...base, revenueCagr: g, marginExpansion: m });
      moicRow.push(r.moic);
      irrRow.push(r.irr);
    }
    moic.push(moicRow);
    irr.push(irrRow);
  }
  return {
    rows: { label: "Revenue CAGR", values: cagrs },
    cols: { label: "Margin expansion", values: marginDeltas },
    moic,
    irr,
  };
}
