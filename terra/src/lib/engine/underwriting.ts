/**
 * UNDERWRITING — a school P&L, built from the drivers that actually move it:
 * capacity, utilisation, tuition, staff ratio, rent and capex.
 *
 * Deliberately not a replacement for a full Excel model. It is the model a
 * partner needs on screen during a conversation.
 */

import { round } from "./types";

export interface UnderwritingAssumptions {
  startYear: number;
  years: number;

  capacity: number;
  capacityAdditions: number[]; // per projected year
  students: number;
  studentGrowth: number; // p.a., applied against capacity ceiling
  tuition: number;
  tuitionGrowth: number;
  otherRevenuePerStudent: number;
  otherRevenueGrowth: number;

  studentTeacherRatio: number;
  teacherCost: number; // fully loaded, per teacher
  teacherCostGrowth: number;
  nonTeachingStaffRatio: number; // non-teaching staff as a share of teacher cost
  otherOpexPerStudent: number;
  otherOpexGrowth: number;

  rent: number;
  rentIndexation: number;
  maintenanceCapexPerStudent: number;
  growthCapex: number[]; // per projected year
  taxRate: number;
  workingCapitalPctRevenue: number;
}

export interface UnderwritingYear {
  year: number;
  capacity: number;
  students: number;
  utilisation: number;
  tuition: number;
  tuitionRevenue: number;
  otherRevenue: number;
  revenue: number;
  revenueGrowth: number | null;
  teachers: number;
  staffCost: number;
  otherOpex: number;
  rent: number;
  ebitdaPreRent: number;
  ebitda: number;
  ebitdaMargin: number;
  maintenanceCapex: number;
  growthCapex: number;
  tax: number;
  workingCapitalMovement: number;
  freeCashFlow: number;
}

export interface UnderwritingResult {
  years: UnderwritingYear[];
  summary: {
    entryRevenue: number;
    exitRevenue: number;
    revenueCagr: number;
    entryEbitda: number;
    exitEbitda: number;
    ebitdaCagr: number;
    entryMargin: number;
    exitMargin: number;
    cumulativeFcf: number;
  };
}

export const DEFAULT_ASSUMPTIONS: UnderwritingAssumptions = {
  startYear: new Date().getFullYear(),
  years: 5,
  capacity: 1000,
  capacityAdditions: [0, 0, 0, 0, 0],
  students: 850,
  studentGrowth: 0.03,
  tuition: 9500,
  tuitionGrowth: 0.035,
  otherRevenuePerStudent: 900,
  otherRevenueGrowth: 0.03,
  studentTeacherRatio: 11,
  teacherCost: 43000,
  teacherCostGrowth: 0.03,
  nonTeachingStaffRatio: 0.35,
  otherOpexPerStudent: 1800,
  otherOpexGrowth: 0.025,
  rent: 0,
  rentIndexation: 0.02,
  maintenanceCapexPerStudent: 350,
  growthCapex: [0, 0, 0, 0, 0],
  taxRate: 0.25,
  workingCapitalPctRevenue: -0.06, // schools collect ahead of delivery
};

export function runUnderwriting(input: UnderwritingAssumptions): UnderwritingResult {
  const years: UnderwritingYear[] = [];

  let capacity = input.capacity;
  let students = input.students;
  let tuition = input.tuition;
  let otherPerStudent = input.otherRevenuePerStudent;
  let teacherCost = input.teacherCost;
  let otherOpexPerStudent = input.otherOpexPerStudent;
  let rent = input.rent;
  let previousRevenue: number | null = null;
  let previousWorkingCapital: number | null = null;

  for (let i = 0; i < input.years; i++) {
    if (i > 0) {
      capacity += input.capacityAdditions[i] ?? 0;
      // Enrolment cannot exceed capacity — the constraint that defines the sector.
      students = Math.min(capacity, students * (1 + input.studentGrowth));
      tuition *= 1 + input.tuitionGrowth;
      otherPerStudent *= 1 + input.otherRevenueGrowth;
      teacherCost *= 1 + input.teacherCostGrowth;
      otherOpexPerStudent *= 1 + input.otherOpexGrowth;
      rent *= 1 + input.rentIndexation;
    } else {
      capacity += input.capacityAdditions[0] ?? 0;
      students = Math.min(capacity, students);
    }

    // Round the components first, then total them, so a displayed revenue
    // line always reconciles to the rows above it.
    const tuitionRevenue = round(students * tuition);
    const otherRevenue = round(students * otherPerStudent);
    const revenue = tuitionRevenue + otherRevenue;

    const teachers = input.studentTeacherRatio > 0 ? students / input.studentTeacherRatio : 0;
    const teachingCost = teachers * teacherCost;
    const staffCost = teachingCost * (1 + input.nonTeachingStaffRatio);
    const otherOpex = students * otherOpexPerStudent;

    const ebitdaPreRent = revenue - staffCost - otherOpex;
    const ebitda = ebitdaPreRent - rent;
    const maintenanceCapex = students * input.maintenanceCapexPerStudent;
    const growthCapex = input.growthCapex[i] ?? 0;
    const tax = Math.max(0, ebitda) * input.taxRate;

    const workingCapital = revenue * input.workingCapitalPctRevenue;
    const workingCapitalMovement =
      previousWorkingCapital === null ? 0 : -(workingCapital - previousWorkingCapital);

    const freeCashFlow = ebitda - maintenanceCapex - growthCapex - tax + workingCapitalMovement;

    years.push({
      year: input.startYear + i,
      capacity: round(capacity),
      students: round(students),
      utilisation: capacity > 0 ? round(students / capacity, 4) : 0,
      tuition: round(tuition),
      tuitionRevenue,
      otherRevenue,
      revenue,
      revenueGrowth: previousRevenue === null ? null : round(revenue / previousRevenue - 1, 4),
      teachers: round(teachers, 1),
      staffCost: round(staffCost),
      otherOpex: round(otherOpex),
      rent: round(rent),
      ebitdaPreRent: round(ebitdaPreRent),
      ebitda: round(ebitda),
      ebitdaMargin: revenue > 0 ? round(ebitda / revenue, 4) : 0,
      maintenanceCapex: round(maintenanceCapex),
      growthCapex: round(growthCapex),
      tax: round(tax),
      workingCapitalMovement: round(workingCapitalMovement),
      freeCashFlow: round(freeCashFlow),
    });

    previousRevenue = revenue;
    previousWorkingCapital = workingCapital;
  }

  const first = years[0]!;
  const last = years[years.length - 1]!;
  const periods = Math.max(1, years.length - 1);

  return {
    years,
    summary: {
      entryRevenue: first.revenue,
      exitRevenue: last.revenue,
      revenueCagr: cagr(first.revenue, last.revenue, periods),
      entryEbitda: first.ebitda,
      exitEbitda: last.ebitda,
      ebitdaCagr: cagr(first.ebitda, last.ebitda, periods),
      entryMargin: first.ebitdaMargin,
      exitMargin: last.ebitdaMargin,
      cumulativeFcf: round(years.reduce((a, y) => a + y.freeCashFlow, 0)),
    },
  };
}

export function cagr(start: number, end: number, periods: number): number {
  if (start <= 0 || end <= 0 || periods <= 0) return 0;
  return round((end / start) ** (1 / periods) - 1, 4);
}

/** Downside / base / upside from one base case, moving the drivers that matter. */
export function scenarioSet(base: UnderwritingAssumptions): Record<
  "DOWNSIDE" | "BASE" | "UPSIDE",
  UnderwritingAssumptions
> {
  return {
    DOWNSIDE: {
      ...base,
      studentGrowth: base.studentGrowth - 0.035,
      tuitionGrowth: Math.max(0, base.tuitionGrowth - 0.015),
      teacherCostGrowth: base.teacherCostGrowth + 0.01,
      otherOpexGrowth: base.otherOpexGrowth + 0.01,
    },
    BASE: { ...base },
    UPSIDE: {
      ...base,
      studentGrowth: base.studentGrowth + 0.025,
      tuitionGrowth: base.tuitionGrowth + 0.01,
      teacherCostGrowth: Math.max(0, base.teacherCostGrowth - 0.005),
    },
  };
}
