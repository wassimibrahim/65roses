import { describe, it, expect } from "vitest";
import { planQuery, planIsEmpty, normalise } from "@/lib/engine/query-intent";

describe("query intent", () => {
  it("recognises an introduction question", () => {
    const plan = planQuery("Who can introduce us to Group Y?");
    expect(plan.intent).toBe("INTRODUCTION_PATH");
  });

  it("recognises a mandate-fit question", () => {
    const plan = planQuery("Which active investor mandates fit Colegio Monteverde?");
    expect(plan.intent).toBe("MANDATES_FOR_ASSET");
  });

  it("recognises a reverse-match question", () => {
    const plan = planQuery("Find targets for the ISP Spain mandate");
    expect(plan.intent).toBe("TARGETS_FOR_MANDATE");
  });

  it("recognises cold relationships", () => {
    expect(planQuery("Which relationships have gone cold?").intent).toBe("COLD_RELATIONSHIPS");
    expect(planQuery("Who have we not spoken to?").intent).toBe("COLD_RELATIONSHIPS");
  });

  it("recognises uncontacted opportunities", () => {
    const plan = planQuery("What are the strongest proprietary opportunities we have not contacted?");
    expect(plan.intent).toBe("UNCONTACTED_OPPORTUNITIES");
  });

  it("recognises a precedent transaction question and its year", () => {
    const plan = planQuery("Show every Spanish school transaction since 2020 in our database");
    expect(plan.intent).toBe("PRECEDENT_TRANSACTIONS");
    expect(plan.sinceYear).toBe(2020);
  });

  it("recognises a recent-change question and its city", () => {
    const plan = planQuery("What changed in our Madrid opportunity pipeline this month?");
    expect(plan.intent).toBe("RECENT_CHANGES");
    expect(plan.filters.city).toBe("Madrid");
  });

  it("parses the headline structured search from the specification", () => {
    const plan = planQuery(
      "Show me family-owned schools in Madrid with >700 students, owned real estate and likely succession considerations",
    );
    expect(plan.intent).toBe("INSTITUTION_SEARCH");
    expect(plan.filters.city).toBe("Madrid");
    expect(plan.filters.ownership).toEqual(["FOUNDER", "FAMILY"]);
    expect(plan.filters.minStudents).toBe(700);
    expect(plan.filters.ownedProperty).toBe(true);
    expect(plan.filters.succession).toBe(true);
  });

  it("distinguishes founder-owned from family-owned", () => {
    expect(planQuery("founder-owned schools").filters.ownership).toEqual(["FOUNDER"]);
    expect(planQuery("family-owned schools").filters.ownership).toEqual(["FOUNDER", "FAMILY"]);
  });

  it("parses both an upper and a lower student bound", () => {
    const plan = planQuery("schools with more than 500 students and fewer than 1,200 students");
    expect(plan.filters.minStudents).toBe(500);
    expect(plan.filters.maxStudents).toBe(1200);
  });

  it("reads a thousands separator correctly", () => {
    expect(planQuery("schools with over 1,500 students").filters.minStudents).toBe(1500);
  });

  it("matches an accented city name", () => {
    expect(planQuery("bilingual schools in Málaga").filters.city).toBe("Malaga");
    expect(normalise("Málaga")).toBe("malaga");
  });

  it("prefers a city over a country when both appear", () => {
    const plan = planQuery("schools in Madrid, Spain");
    expect(plan.filters.city).toBe("Madrid");
    expect(plan.filters.country).toBeUndefined();
  });

  it("collects multiple segments", () => {
    const plan = planQuery("bilingual and international school assets");
    expect(plan.filters.segments).toContain("BILINGUAL_SCHOOL");
    expect(plan.filters.segments).toContain("INTERNATIONAL_SCHOOL");
  });

  it("reports an unusable plan rather than matching everything", () => {
    expect(planIsEmpty(planQuery("hello"))).toBe(true);
    expect(planIsEmpty(planQuery("schools in Madrid"))).toBe(false);
  });

  it("is deterministic", () => {
    const q = "family-owned K-12 schools in Barcelona with owned real estate";
    expect(planQuery(q)).toEqual(planQuery(q));
  });
});
