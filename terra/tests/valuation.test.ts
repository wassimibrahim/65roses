import { describe, it, expect } from "vitest";
import {
  compSetStats,
  dcf,
  evFromMultiple,
  valueProperty,
  sumOfTheParts,
  rentAdjustedEbitda,
  blendRanges,
  type ComparableInput,
} from "@/lib/engine/valuation";

const comps: ComparableInput[] = [
  { target: "A", buyer: "X", country: "Spain", date: "2023-05-01", segment: "K12", evEbitda: 11, evRevenue: 2.4, realEstateIncluded: true },
  { target: "B", buyer: "Y", country: "Spain", date: "2022-09-01", segment: "K12", evEbitda: 9.5, evRevenue: 2.0, realEstateIncluded: false },
  { target: "C", buyer: "Z", country: "Portugal", date: "2024-02-01", segment: "K12", evEbitda: 13, evRevenue: 2.9, realEstateIncluded: true },
  { target: "D", buyer: "W", country: "Italy", date: "2021-11-01", segment: "K12", evEbitda: 8, evRevenue: 1.8, realEstateIncluded: false },
];

describe("valuation", () => {
  it("summarises a comparable set as an interquartile band", () => {
    const stats = compSetStats(comps);
    expect(stats.count).toBe(4);
    expect(stats.evEbitda!.low).toBeLessThan(stats.evEbitda!.median);
    expect(stats.evEbitda!.median).toBeLessThan(stats.evEbitda!.high);
    expect(stats.evEbitda!.median).toBeCloseTo(10.25, 2);
  });

  it("ignores missing multiples rather than treating them as zero", () => {
    const stats = compSetStats([
      ...comps,
      { target: "E", buyer: "V", country: "Spain", date: "2024-01-01", segment: "K12", evEbitda: null, evRevenue: null, realEstateIncluded: false },
    ]);
    expect(stats.evEbitda!.median).toBeCloseTo(10.25, 2);
  });

  it("applies a multiple range to a metric", () => {
    const range = evFromMultiple(3_000_000, 9, 12);
    expect(range.low).toBe(27_000_000);
    expect(range.high).toBe(36_000_000);
  });

  it("values property by capitalising rent, with a lower yield giving a higher value", () => {
    const range = valueProperty({ marketRent: 1_400_000, yieldLow: 0.055, yieldHigh: 0.07 })!;
    expect(range.low).toBeCloseTo(20_000_000, -4);
    expect(range.high).toBeCloseTo(25_454_545, -4);
    expect(range.high).toBeGreaterThan(range.low);
  });

  it("falls back to area-based property valuation", () => {
    const range = valueProperty({
      marketRent: 0,
      yieldLow: 0,
      yieldHigh: 0,
      builtAreaSqm: 12_000,
      valuePerSqmLow: 1_400,
      valuePerSqmHigh: 1_800,
    })!;
    expect(range.low).toBe(16_800_000);
    expect(range.high).toBe(21_600_000);
  });

  it("returns null when a property cannot be valued at all", () => {
    expect(valueProperty({ marketRent: 0, yieldLow: 0, yieldHigh: 0 })).toBeNull();
  });

  it("sums the parts and deducts net debt for equity", () => {
    const result = sumOfTheParts({
      opco: { low: 28_000_000, high: 36_000_000 },
      propco: { low: 18_000_000, high: 23_000_000 },
      netDebt: 4_000_000,
    });
    expect(result.combined).toEqual({ low: 46_000_000, high: 59_000_000 });
    expect(result.equity).toEqual({ low: 42_000_000, high: 55_000_000 });
  });

  it("charges market rent against an owned-campus EBITDA", () => {
    expect(rentAdjustedEbitda(4_500_000, 1_400_000)).toBe(3_100_000);
  });

  it("discounts a cash-flow stream to a present value", () => {
    const result = dcf({
      cashFlows: [1_000_000, 1_100_000, 1_200_000, 1_300_000, 1_400_000],
      discountRate: 0.1,
      terminalGrowth: 0.02,
      netDebt: 5_000_000,
    });
    expect(result.enterpriseValue).toBeGreaterThan(result.pvExplicit);
    expect(result.equityValue).toBe(result.enterpriseValue - 5_000_000);
    expect(result.terminalValue).toBeCloseTo((1_400_000 * 1.02) / 0.08, -3);
  });

  it("refuses a terminal growth rate at or above the discount rate", () => {
    expect(() =>
      dcf({ cashFlows: [1_000_000], discountRate: 0.05, terminalGrowth: 0.06, netDebt: 0 }),
    ).toThrow(/discount rate/i);
  });

  it("blends ranges by weight and skips absent methods", () => {
    const blended = blendRanges(
      [{ low: 10, high: 20 }, null, { low: 30, high: 40 }],
      [1, 1, 3],
    )!;
    expect(blended.low).toBe(25);
    expect(blended.high).toBe(35);
  });
});
