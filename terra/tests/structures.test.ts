import { describe, it, expect } from "vitest";
import {
  modelStructure,
  modelAllStructures,
  ALL_STRUCTURES,
  type StructureAssumptions,
} from "@/lib/engine/structures";
import { evaluateStructuresAgainstObjectives } from "@/lib/engine/legacy";

const assumptions: StructureAssumptions = {
  ebitdaPreRent: 4_500_000,
  opcoMultiple: 11,
  marketRent: 1_400_000,
  propertyYield: 0.065,
  existingNetDebt: 3_000_000,
  exitYears: 5,
  exitEbitdaGrowth: 0.07,
  transactionCostsPct: 0.02,
};

describe("structure lab", () => {
  it("models every structure without throwing", () => {
    const outcomes = modelAllStructures(assumptions);
    expect(outcomes).toHaveLength(ALL_STRUCTURES.length);
    for (const o of outcomes) {
      expect(Number.isFinite(o.founderProceeds)).toBe(true);
      expect(o.founderProceeds).toBeGreaterThanOrEqual(0);
      expect(o.notes.length).toBeGreaterThan(0);
    }
  });

  it("capitalises rent into a property value", () => {
    const o = modelStructure("PROPCO_SALE", assumptions);
    expect(o.propertyValue).toBeCloseTo(1_400_000 / 0.065, -3);
  });

  it("charges market rent against the OpCo in an OpCo sale", () => {
    const o = modelStructure("OPCO_SALE", assumptions);
    expect(o.ebitdaAfterRent).toBe(4_500_000 - 1_400_000);
    expect(o.enterpriseValue).toBeCloseTo(3_100_000 * 11, -3);
    expect(o.rentImplication).toBe(1_400_000);
  });

  it("gives a full sale the highest immediate founder proceeds", () => {
    const outcomes = modelAllStructures(assumptions);
    const full = outcomes.find((o) => o.type === "FULL_SALE")!;
    for (const other of outcomes) {
      expect(full.founderProceeds).toBeGreaterThanOrEqual(other.founderProceeds - 1);
    }
  });

  it("leaves the founder in control where the structure says so", () => {
    expect(modelStructure("FULL_SALE", assumptions).controlRetained).toBe(false);
    expect(modelStructure("SALE_LEASEBACK", assumptions).controlRetained).toBe(true);
    expect(modelStructure("MINORITY_GROWTH", assumptions).controlRetained).toBe(true);
    expect(modelStructure("RECAPITALISATION", assumptions).controlRetained).toBe(true);
  });

  it("retains the complement of the stake sold in a majority partnership", () => {
    const o = modelStructure("MAJORITY_PARTNERSHIP", { ...assumptions, stakeSold: 0.7 });
    expect(o.stakeRetained).toBeCloseTo(0.3, 3);
    expect(o.secondExitProceeds).toBeGreaterThan(0);
  });

  it("pays the founder nothing in a minority growth round", () => {
    const o = modelStructure("MINORITY_GROWTH", { ...assumptions, stakeSold: 0.25 });
    expect(o.founderProceeds).toBe(0);
    expect(o.investorEquity).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    expect(modelAllStructures(assumptions)).toEqual(modelAllStructures(assumptions));
  });
});

describe("founder legacy fit", () => {
  const outcomes = modelAllStructures(assumptions);
  const objectives = [
    { objective: "MAINTAIN_NAME" as const, rank: 1 },
    { objective: "FAMILY_INVOLVEMENT" as const, rank: 2 },
    { objective: "PARTIAL_LIQUIDITY" as const, rank: 3 },
    { objective: "MAXIMUM_VALUATION" as const, rank: 4 },
  ];

  it("scores every structure on both axes", () => {
    const fits = evaluateStructuresAgainstObjectives(outcomes, objectives);
    expect(fits).toHaveLength(outcomes.length);
    for (const f of fits) {
      expect(f.financialOutcome).toBeGreaterThanOrEqual(0);
      expect(f.financialOutcome).toBeLessThanOrEqual(100);
      expect(f.legacyPreservation).toBeGreaterThanOrEqual(0);
      expect(f.legacyPreservation).toBeLessThanOrEqual(100);
    }
  });

  it("ranks a full sale ahead financially and behind on legacy", () => {
    const fits = evaluateStructuresAgainstObjectives(outcomes, objectives);
    const full = fits.find((f) => f.type === "FULL_SALE")!;
    const majority = fits.find((f) => f.type === "MAJORITY_PARTNERSHIP")!;
    expect(full.financialOutcome).toBeGreaterThan(majority.financialOutcome);
    expect(full.legacyPreservation).toBeLessThan(majority.legacyPreservation);
  });

  it("normalises objective weights to one", () => {
    const fits = evaluateStructuresAgainstObjectives(outcomes, objectives);
    const total = fits[0]!.perObjective.reduce((a, p) => a + p.weight, 0);
    expect(total).toBeCloseTo(1, 2);
  });

  it("shifts the answer when the founder re-ranks their objectives", () => {
    const legacyFirst = evaluateStructuresAgainstObjectives(outcomes, objectives);
    const moneyFirst = evaluateStructuresAgainstObjectives(outcomes, [
      { objective: "MAXIMUM_VALUATION", rank: 1 },
      { objective: "PARTIAL_LIQUIDITY", rank: 2 },
      { objective: "MAINTAIN_NAME", rank: 3 },
      { objective: "FAMILY_INVOLVEMENT", rank: 4 },
    ]);
    const a = legacyFirst.find((f) => f.type === "FULL_SALE")!.objectiveFit;
    const b = moneyFirst.find((f) => f.type === "FULL_SALE")!.objectiveFit;
    expect(b).toBeGreaterThan(a);
  });
});
