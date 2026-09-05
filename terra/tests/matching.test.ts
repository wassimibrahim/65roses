import { describe, it, expect } from "vitest";
import {
  matchScore,
  rankMandatesForAsset,
  rankAssetsForMandate,
  type AssetProfile,
  type MandateProfile,
} from "@/lib/engine/matching";

const madridK12: AssetProfile = {
  id: "asset-1",
  name: "Colegio Monteverde",
  country: "Spain",
  region: "Madrid",
  city: "Madrid",
  type: "K12",
  curriculum: ["Bilingual", "IB"],
  students: 890,
  enterpriseValue: 37_000_000,
  ebitda: 3_100_000,
  tenure: "OWNED",
  propertyValue: 21_000_000,
  ownershipType: "FAMILY",
  relationshipStrength: 4,
};

const operatorMandate: MandateProfile = {
  id: "mandate-1",
  organisationId: "org-1",
  organisationName: "Cognita",
  organisationType: "EDUCATION_OPERATOR",
  mandateName: "Iberia add-ons",
  isActive: true,
  countries: ["Spain", "Portugal"],
  regions: ["Madrid", "Barcelona"],
  segments: ["K12", "INTERNATIONAL_SCHOOL"],
  curricula: ["IB", "Bilingual"],
  minEv: 20_000_000,
  maxEv: 90_000_000,
  minEbitda: 3_000_000,
  maxEbitda: 12_000_000,
  minStudents: 600,
  maxStudents: 2500,
  control: "CONTROL",
  propertyPreference: "PROPERTY_LIGHT",
  requiresOwnedProperty: false,
  leaseAcceptable: true,
  platformStrategy: "ADD_ON",
  existingPlatforms: ["Spain"],
  acquisitionPatterns: ["K12", "INTERNATIONAL_SCHOOL"],
  relationshipStrength: 4,
};

describe("match engine", () => {
  it("scores an obvious strategic fit above 80", () => {
    const result = matchScore(madridK12, operatorMandate);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.disqualified).toBe(false);
  });

  it("explains every score", () => {
    const result = matchScore(madridK12, operatorMandate);
    expect(result.reasons.length).toBeGreaterThan(2);
    expect(result.dimensions).toHaveLength(10);
    for (const dim of result.dimensions) {
      expect(dim.raw).toBeGreaterThanOrEqual(0);
      expect(dim.raw).toBeLessThanOrEqual(100);
    }
  });

  it("surfaces issues as well as reasons", () => {
    const result = matchScore(madridK12, operatorMandate);
    // Property-light buyer against an owned campus is a real tension.
    expect(result.issues.join(" ")).toMatch(/PropCo|property/i);
  });

  it("disqualifies on geography but still explains why", () => {
    const result = matchScore(
      { ...madridK12, country: "Germany", region: "Bavaria" },
      operatorMandate,
    );
    expect(result.disqualified).toBe(true);
    expect(result.score).toBeLessThanOrEqual(34);
    expect(result.issues.join(" ")).toContain("outside the stated mandate geography");
  });

  it("disqualifies when the buyer requires freehold and the asset is leased", () => {
    const result = matchScore(
      { ...madridK12, tenure: "LEASED", propertyValue: null },
      { ...operatorMandate, propertyPreference: "REQUIRES_OWNED", requiresOwnedProperty: true },
    );
    expect(result.disqualified).toBe(true);
  });

  it("penalises a size mismatch outside the mandate band", () => {
    const tiny = matchScore(
      { ...madridK12, enterpriseValue: 3_000_000, ebitda: 250_000, students: 120 },
      operatorMandate,
    );
    const right = matchScore(madridK12, operatorMandate);
    expect(tiny.score).toBeLessThan(right.score);
  });

  it("is symmetric between forward and reverse matching", () => {
    const forward = rankMandatesForAsset(madridK12, [operatorMandate]);
    const reverse = rankAssetsForMandate(operatorMandate, [madridK12]);
    expect(forward[0]!.score).toBe(reverse[0]!.score);
  });

  it("ranks by score, best first", () => {
    const weaker: MandateProfile = {
      ...operatorMandate,
      id: "mandate-2",
      organisationName: "Generic Fund",
      organisationType: "PRIVATE_EQUITY",
      regions: [],
      curricula: [],
      existingPlatforms: [],
      acquisitionPatterns: [],
      relationshipStrength: 2,
    };
    const ranked = rankMandatesForAsset(madridK12, [weaker, operatorMandate]);
    expect(ranked[0]!.mandateId).toBe("mandate-1");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it("rewards a property investor only where there is a freehold", () => {
    const propcoMandate: MandateProfile = {
      ...operatorMandate,
      id: "mandate-re",
      organisationName: "Iberian Social Infrastructure",
      organisationType: "REAL_ESTATE_INVESTOR",
      propertyPreference: "REQUIRES_OWNED",
      requiresOwnedProperty: true,
      control: "FLEXIBLE",
    };
    const owned = matchScore(madridK12, propcoMandate);
    const leased = matchScore({ ...madridK12, tenure: "LEASED" }, propcoMandate);
    expect(owned.score).toBeGreaterThan(leased.score);
    expect(owned.disqualified).toBe(false);
  });

  it("drops an inactive mandate below a live one", () => {
    const dormant = { ...operatorMandate, id: "m-dormant", isActive: false };
    const ranked = rankMandatesForAsset(madridK12, [dormant, operatorMandate]);
    expect(ranked[0]!.mandateId).toBe("mandate-1");
  });
});

describe("property mandates", () => {
  const propcoMandate: MandateProfile = {
    ...operatorMandate,
    id: "mandate-propco",
    organisationName: "Iberian Social Infrastructure",
    organisationType: "REAL_ESTATE_INVESTOR",
    control: "CONTROL",
    propertyPreference: "REQUIRES_OWNED",
    requiresOwnedProperty: true,
    leaseAcceptable: false,
    // The band is stated in property value, which is how a landlord thinks.
    minEv: 8_000_000,
    maxEv: 30_000_000,
    minEbitda: 3_000_000,
    maxEbitda: 12_000_000,
    minStudents: 600,
    maxStudents: 2500,
  };

  it("sizes a property mandate on the property value, not the enterprise value", () => {
    // EV of €37m is outside the €8–30m band; the €21m freehold is inside it.
    const result = matchScore(madridK12, propcoMandate);
    const size = result.dimensions.find((d) => d.key === "size")!;
    expect(size.raw).toBe(100);
    expect(result.reasons.join(" ")).toContain("Property value sits inside the mandate band");
  });

  it("does not test a property mandate against the EBITDA band", () => {
    const result = matchScore({ ...madridK12, ebitda: 250_000 }, propcoMandate);
    expect(result.issues.join(" ")).not.toContain("EBITDA");
  });

  it("still tests an operating buyer against enterprise value and EBITDA", () => {
    const result = matchScore(madridK12, operatorMandate);
    expect(result.reasons.join(" ")).toContain("Enterprise value sits inside the mandate band");
  });

  it("penalises a property mandate where there is no freehold to buy", () => {
    const result = matchScore(
      { ...madridK12, tenure: "LEASED", propertyValue: null },
      propcoMandate,
    );
    expect(result.disqualified).toBe(true);
    const size = result.dimensions.find((d) => d.key === "size")!;
    expect(size.raw).toBe(0);
  });
});
