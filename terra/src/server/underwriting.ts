import "server-only";
import { db } from "@/lib/db";
import { scoredInstitutionBySlug, scoreUniverse } from "@/server/scoring";
import { relevantComparables } from "@/server/institution";
import { compSetStats } from "@/lib/engine/valuation";
import type { UnderwritingAssumptions } from "@/lib/engine/underwriting";
import { DEFAULT_ASSUMPTIONS } from "@/lib/engine/underwriting";

/**
 * Builds a starting assumption set from what Terra already knows about the
 * institution, so the analyst begins from the real asset rather than a blank
 * model.
 */
export async function underwritingSetup(slug: string) {
  const scored = await scoredInstitutionBySlug(slug);
  if (!scored) return null;

  const [record, comparables] = await Promise.all([
    db.educationInstitution.findUnique({
      where: { slug },
      include: {
        financials: { orderBy: { year: "asc" } },
        properties: { take: 1 },
        valuations: { orderBy: { createdAt: "asc" } },
        projections: true,
      },
    }),
    relevantComparables(scored),
  ]);
  if (!record) return null;

  const latest = record.financials[record.financials.length - 1];
  const property = record.properties[0];
  const owned = record.tenure === "OWNED" || record.tenure === "MIXED";

  const students = record.students ?? DEFAULT_ASSUMPTIONS.students;
  const capacity = record.capacity ?? Math.round(students * 1.15);
  const tuition = record.tuitionAverage ?? DEFAULT_ASSUMPTIONS.tuition;
  const revenue = latest?.revenue ?? students * tuition * 1.09;
  const ebitda = latest?.ebitda ?? revenue * 0.2;
  const ratio = record.studentTeacherRatio ?? 12;

  // Back out a teacher cost consistent with the observed margin, so year one of
  // the model reconciles to the financial record rather than contradicting it.
  const otherOpexPerStudent = DEFAULT_ASSUMPTIONS.otherOpexPerStudent;
  const rent = owned ? 0 : (latest?.rent ?? revenue * 0.105);
  const staffCost = revenue - ebitda - rent - students * otherOpexPerStudent;
  const teachers = students / ratio;
  const teacherCost =
    teachers > 0 && staffCost > 0
      ? Math.round(staffCost / (teachers * (1 + DEFAULT_ASSUMPTIONS.nonTeachingStaffRatio)))
      : DEFAULT_ASSUMPTIONS.teacherCost;

  const assumptions: UnderwritingAssumptions = {
    ...DEFAULT_ASSUMPTIONS,
    startYear: (latest?.year ?? new Date().getFullYear()) + 1,
    years: 5,
    capacity,
    capacityAdditions: [0, 0, 0, 0, 0],
    students,
    studentGrowth: Math.max(-0.05, Math.min(0.12, scored.revenueGrowth ?? 0.03)),
    tuition,
    tuitionGrowth: 0.035,
    otherRevenuePerStudent: Math.round(tuition * 0.09),
    studentTeacherRatio: ratio,
    teacherCost,
    otherOpexPerStudent,
    rent,
    maintenanceCapexPerStudent: Math.round(((latest?.capex ?? revenue * 0.03) / students) || 350),
    growthCapex: [0, 0, 0, 0, 0],
  };

  const stats = compSetStats(
    comparables.map((c) => ({
      target: c.target, buyer: c.buyer, country: c.country, date: c.date,
      segment: c.segment, evEbitda: c.evEbitda, evRevenue: c.evRevenue,
      realEstateIncluded: c.realEstateIncluded,
    })),
  );

  return {
    scored,
    record,
    assumptions,
    comparables,
    stats,
    marketRent: owned ? (property?.marketRentEstimate ?? 0) : 0,
    propertyValue: owned
      ? { low: property?.valueEstimateLow ?? 0, high: property?.valueEstimateHigh ?? 0 }
      : null,
    netDebt: latest?.netDebt ?? 0,
    history: record.financials.map((f) => ({
      year: f.year,
      revenue: f.revenue,
      ebitda: f.ebitda,
      students: f.students,
      basis: f.basis,
    })),
  };
}

export async function modelledInstitutions() {
  const universe = await scoreUniverse();
  return universe
    .filter((i) => i.revenue !== null)
    .sort((a, b) => b.displayScore - a.displayScore);
}

export async function allComparables() {
  return db.transactionComparable.findMany({ orderBy: { date: "desc" } });
}
