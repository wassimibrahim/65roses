import { describe, it, expect } from "vitest";
import {
  computeReturns,
  irrFromCashFlows,
  entryExitMatrix,
  growthMarginMatrix,
  type ReturnsInput,
} from "@/lib/engine/returns";

const base: ReturnsInput = {
  entryEv: 34_000_000,
  entryDebt: 12_000_000,
  entryEbitda: 3_400_000,
  entryRevenue: 13_600_000,
  revenueCagr: 0.07,
  marginExpansion: 0.03,
  holdYears: 5,
  exitMultiple: 11,
  cumulativeFcf: 6_000_000,
};

describe("returns", () => {
  it("derives entry equity and entry multiple", () => {
    const r = computeReturns(base);
    expect(r.entryEquity).toBe(22_000_000);
    expect(r.entryMultiple).toBe(10);
  });

  it("grows EBITDA through revenue and margin expansion", () => {
    const r = computeReturns(base);
    const exitRevenue = 13_600_000 * 1.07 ** 5;
    const exitMargin = 3_400_000 / 13_600_000 + 0.03;
    expect(r.exitEbitda).toBeCloseTo(exitRevenue * exitMargin, -3);
  });

  it("pays down debt with cumulative free cash flow", () => {
    const r = computeReturns(base);
    expect(r.exitNetDebt).toBe(6_000_000);
  });

  it("never reports negative net debt from over-generation of cash", () => {
    const r = computeReturns({ ...base, cumulativeFcf: 50_000_000 });
    expect(r.exitNetDebt).toBe(0);
  });

  it("computes MOIC as exit equity over entry equity", () => {
    const r = computeReturns(base);
    expect(r.moic).toBeCloseTo(r.exitEquity / r.entryEquity, 2);
    expect(r.moic).toBeGreaterThan(1);
  });

  it("computes an IRR consistent with the MOIC over the hold", () => {
    const r = computeReturns(base);
    // MOIC is reported to two decimals; IRR is derived from the unrounded ratio.
    const preciseMoic = r.exitEquity / r.entryEquity;
    expect(r.irr).toBeCloseTo(preciseMoic ** (1 / 5) - 1, 4);
  });

  it("a 2.0x over five years is roughly a 15% IRR", () => {
    const r = computeReturns({
      ...base,
      entryEv: 20_000_000,
      entryDebt: 0,
      entryEbitda: 2_000_000,
      entryRevenue: 10_000_000,
      exitMultiple: 20,
      revenueCagr: 0.0,
      marginExpansion: 0,
      cumulativeFcf: 0,
    });
    expect(r.moic).toBeCloseTo(2.0, 1);
    expect(r.irr).toBeGreaterThan(0.13);
    expect(r.irr).toBeLessThan(0.16);
  });

  it("solves IRR from an explicit cash-flow vector", () => {
    const irr = irrFromCashFlows([-100, 0, 0, 0, 0, 200])!;
    expect(irr).toBeCloseTo(2 ** (1 / 5) - 1, 4);
  });

  it("returns null where a cash-flow vector has no sign change", () => {
    expect(irrFromCashFlows([100, 200, 300])).toBeNull();
  });

  it("builds an entry × exit matrix that improves left-to-right", () => {
    const m = entryExitMatrix(base, [9, 10, 11], [9, 11, 13]);
    expect(m.moic).toHaveLength(3);
    expect(m.moic[0]).toHaveLength(3);
    // Higher exit multiple, same entry → better outcome.
    expect(m.moic[0]![2]!).toBeGreaterThan(m.moic[0]![0]!);
    // Higher entry multiple, same exit → worse outcome.
    expect(m.moic[2]![0]!).toBeLessThan(m.moic[0]![0]!);
  });

  it("builds a growth × margin matrix that improves in both directions", () => {
    const m = growthMarginMatrix(base, [0.03, 0.07, 0.1], [0, 0.03, 0.05]);
    expect(m.moic[2]![2]!).toBeGreaterThan(m.moic[0]![0]!);
  });

  it("is deterministic", () => {
    expect(computeReturns(base)).toEqual(computeReturns(base));
  });
});
