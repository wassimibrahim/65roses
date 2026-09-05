import { describe, it, expect } from "vitest";
import { scoreOpportunity, DEFAULT_WEIGHTS, type ScoringInput } from "@/lib/engine/scoring";

function baseInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    strategic: {
      marketTier: 1,
      curriculum: ["Bilingual", "IB"],
      students: 890,
      capacity: 1000,
      utilisation: 0.89,
      reputation: 78,
      campusCount: 1,
      hasExpansionHeadroom: true,
    },
    financial: {
      revenue: 12_000_000,
      revenueGrowth: 0.08,
      ebitda: 3_100_000,
      ebitdaMargin: 0.258,
      capexToRevenue: 0.035,
      predictability: 0.9,
    },
    transaction: {
      successionStatus: "POTENTIAL_SUCCESSION_ISSUE",
      ownershipType: "FAMILY",
      founderAge: 68,
      ownershipConcentration: 0.85,
      priorCapitalInterest: false,
      strategicChangeSignals: 2,
      expansionFundingNeed: true,
    },
    demand: { matchScores: [91, 84, 76, 55] },
    realEstate: {
      tenure: "OWNED",
      propertyValue: 21_000_000,
      enterpriseValue: 37_000_000,
      saleLeasebackCandidate: true,
      developmentPotential: true,
    },
    relationship: {
      bestStrength: 4,
      hasWarmIntroduction: true,
      priorConversation: false,
      clientReferral: false,
    },
    ...overrides,
  };
}

describe("Terra Opportunity Score", () => {
  it("stays inside 0–100", () => {
    const result = scoreOpportunity(baseInput());
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("is deterministic", () => {
    const a = scoreOpportunity(baseInput());
    const b = scoreOpportunity(baseInput());
    expect(a.total).toBe(b.total);
    expect(a.dimensions.map((d) => d.raw)).toEqual(b.dimensions.map((d) => d.raw));
  });

  it("rates a well-evidenced founder-owned Madrid asset highly", () => {
    const result = scoreOpportunity(baseInput());
    expect(result.total).toBeGreaterThanOrEqual(75);
  });

  it("weights sum to 1 after normalisation", () => {
    const result = scoreOpportunity(baseInput());
    const total = result.dimensions.reduce((a, d) => a + d.weight, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  it("headline equals the sum of weighted contributions", () => {
    const result = scoreOpportunity(baseInput());
    const summed = result.dimensions.reduce((a, d) => a + d.weighted, 0);
    expect(Math.abs(result.total - summed)).toBeLessThanOrEqual(0.51);
  });

  it("penalises a government-owned asset on transaction likelihood", () => {
    const owned = scoreOpportunity(baseInput());
    const gov = scoreOpportunity(
      baseInput({
        transaction: { ...baseInput().transaction, ownershipType: "GOVERNMENT" },
      }),
    );
    expect(gov.total).toBeLessThan(owned.total);
    const dim = gov.dimensions.find((d) => d.key === "transactionLikelihood")!;
    expect(dim.detractors.join(" ")).toContain("not transactable");
  });

  it("drops real-estate optionality when the campus is leased", () => {
    const leased = scoreOpportunity(
      baseInput({
        realEstate: {
          tenure: "LEASED",
          propertyValue: null,
          enterpriseValue: 37_000_000,
          saleLeasebackCandidate: false,
          developmentPotential: false,
        },
      }),
    );
    const dim = leased.dimensions.find((d) => d.key === "realEstate")!;
    expect(dim.raw).toBeLessThan(35);
  });

  it("rewards relationship advantage over a cold target", () => {
    const cold = scoreOpportunity(
      baseInput({
        relationship: {
          bestStrength: 1,
          hasWarmIntroduction: false,
          priorConversation: false,
          clientReferral: false,
        },
      }),
    );
    const warm = scoreOpportunity(baseInput());
    expect(warm.total).toBeGreaterThan(cold.total);
  });

  it("reports gaps rather than silently assuming", () => {
    const result = scoreOpportunity(
      baseInput({
        strategic: { ...baseInput().strategic, utilisation: null, students: null, capacity: null, reputation: null },
        transaction: { ...baseInput().transaction, founderAge: null, successionStatus: "UNKNOWN" },
      }),
    );
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps.join(" ")).toMatch(/Utilisation|Succession|Founder age|Reputation/i);
  });

  it("respects custom weights", () => {
    const input = baseInput({
      relationship: {
        bestStrength: 5,
        hasWarmIntroduction: true,
        priorConversation: true,
        clientReferral: true,
      },
      financial: {
        revenue: 4_000_000,
        revenueGrowth: -0.03,
        ebitda: 200_000,
        ebitdaMargin: 0.05,
        capexToRevenue: 0.12,
        predictability: 0.5,
      },
    });
    const balanced = scoreOpportunity(input, DEFAULT_WEIGHTS);
    const relationshipLed = scoreOpportunity(input, {
      ...DEFAULT_WEIGHTS,
      financial: 0.05,
      relationship: 0.4,
    });
    expect(relationshipLed.total).toBeGreaterThan(balanced.total);
  });
});
