import { describe, it, expect } from "vitest";
import {
  runUnderwriting,
  scenarioSet,
  cagr,
  DEFAULT_ASSUMPTIONS,
  type UnderwritingAssumptions,
} from "@/lib/engine/underwriting";

const base: UnderwritingAssumptions = {
  ...DEFAULT_ASSUMPTIONS,
  startYear: 2026,
  years: 5,
  capacity: 1000,
  students: 890,
  studentGrowth: 0.03,
  tuition: 10_500,
  rent: 0,
  growthCapex: [0, 0, 0, 0, 0],
  capacityAdditions: [0, 0, 0, 0, 0],
};

describe("underwriting", () => {
  it("produces one row per projected year", () => {
    const result = runUnderwriting(base);
    expect(result.years).toHaveLength(5);
    expect(result.years[0]!.year).toBe(2026);
    expect(result.years[4]!.year).toBe(2030);
  });

  it("never lets enrolment exceed capacity", () => {
    const result = runUnderwriting({ ...base, students: 990, studentGrowth: 0.25 });
    for (const year of result.years) {
      expect(year.students).toBeLessThanOrEqual(year.capacity);
      expect(year.utilisation).toBeLessThanOrEqual(1);
    }
  });

  it("lets enrolment grow when capacity is added", () => {
    const constrained = runUnderwriting({ ...base, students: 990, studentGrowth: 0.1 });
    const expanded = runUnderwriting({
      ...base,
      students: 990,
      studentGrowth: 0.1,
      capacityAdditions: [0, 300, 0, 0, 0],
    });
    const lastConstrained = constrained.years[4]!;
    const lastExpanded = expanded.years[4]!;
    expect(lastExpanded.students).toBeGreaterThan(lastConstrained.students);
    expect(lastExpanded.revenue).toBeGreaterThan(lastConstrained.revenue);
  });

  it("reconciles revenue to its two components", () => {
    const result = runUnderwriting(base);
    for (const y of result.years) {
      expect(y.tuitionRevenue + y.otherRevenue).toBeCloseTo(y.revenue, 0);
    }
  });

  it("charges rent below the pre-rent line", () => {
    const noRent = runUnderwriting(base);
    const withRent = runUnderwriting({ ...base, rent: 1_400_000 });
    const a = noRent.years[0]!;
    const b = withRent.years[0]!;
    expect(b.ebitdaPreRent).toBeCloseTo(a.ebitdaPreRent, 0);
    expect(a.ebitda - b.ebitda).toBeCloseTo(1_400_000, 0);
  });

  it("indexes rent through the projection", () => {
    const result = runUnderwriting({ ...base, rent: 1_000_000, rentIndexation: 0.02 });
    expect(result.years[4]!.rent).toBeGreaterThan(result.years[0]!.rent);
    expect(result.years[4]!.rent).toBeCloseTo(1_000_000 * 1.02 ** 4, -2);
  });

  it("scales teachers from the student/teacher ratio", () => {
    const result = runUnderwriting({ ...base, studentTeacherRatio: 10 });
    expect(result.years[0]!.teachers).toBeCloseTo(result.years[0]!.students / 10, 1);
  });

  it("computes a CAGR consistent with the first and last year", () => {
    const result = runUnderwriting(base);
    const expected = cagr(result.summary.entryRevenue, result.summary.exitRevenue, 4);
    expect(result.summary.revenueCagr).toBeCloseTo(expected, 4);
  });

  it("orders downside, base and upside correctly", () => {
    const set = scenarioSet(base);
    const down = runUnderwriting(set.DOWNSIDE);
    const mid = runUnderwriting(set.BASE);
    const up = runUnderwriting(set.UPSIDE);
    expect(down.summary.exitEbitda).toBeLessThan(mid.summary.exitEbitda);
    expect(up.summary.exitEbitda).toBeGreaterThan(mid.summary.exitEbitda);
  });

  it("deducts capex and tax from free cash flow", () => {
    const result = runUnderwriting(base);
    const y = result.years[0]!;
    expect(y.freeCashFlow).toBeLessThan(y.ebitda);
    expect(y.freeCashFlow).toBeCloseTo(
      y.ebitda - y.maintenanceCapex - y.growthCapex - y.tax + y.workingCapitalMovement,
      0,
    );
  });

  it("is deterministic", () => {
    expect(runUnderwriting(base)).toEqual(runUnderwriting(base));
  });
});
