/**
 * TERRA OS — demo seed.
 *
 * Everything created here is illustrative. Financial records are derived
 * arithmetically from the enrolment and tuition assumptions in prisma/data so
 * that the whole database is internally consistent: revenue reconciles to
 * students × tuition, EBITDA to revenue × margin, property value to rent ÷
 * yield. Nothing is a random number.
 */

import {
  PrismaClient,
  type Prisma,
  type InstitutionType,
  type Confidence,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { INSTITUTIONS, type InstitutionSeed } from "./data/institutions";
import { ORGANISATIONS } from "./data/organisations";
import { PEOPLE, TERRA_PEOPLE, type PersonSeed } from "./data/people";
import { COMPARABLES, SIGNALS, INTELLIGENCE } from "./data/market";
// Opportunity, deal and saved-view seeding lives in its own module so this file
// stays readable.
import { seedOpportunitiesDealsAndViews } from "./seed-transactions";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const NOW = new Date();

function monthsAgo(months: number): Date {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d;
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

function daysAhead(days: number): Date {
  return new Date(NOW.getTime() + days * 86_400_000);
}

/** Deterministic 0..1 from a string — keeps the demo stable between reseeds. */
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Average realised tuition, net of the sibling and scholarship discounting
 *  every school in this segment actually runs. */
function averageTuition(inst: InstitutionSeed): number {
  return Math.round(((inst.tuitionLow + inst.tuitionHigh) / 2) * 0.94);
}

const OTHER_REVENUE_SHARE = 0.09; // transport, catering, trips, extended day

function revenueFor(inst: InstitutionSeed, students: number): number {
  const tuition = averageTuition(inst);
  return Math.round(students * tuition * (1 + OTHER_REVENUE_SHARE));
}

/** Where the campus is leased, rent is already inside the stated margin. */
function rentFor(inst: InstitutionSeed, revenue: number): number {
  if (inst.tenure === "LEASED") return Math.round(revenue * 0.105);
  if (inst.tenure === "MIXED") return Math.round(revenue * 0.045);
  return 0;
}

/** Rent a market landlord would charge for an owned campus. */
function marketRentFor(inst: InstitutionSeed, revenue: number): number {
  const base = inst.tenure === "MIXED" ? 0.055 : 0.095;
  return Math.round(revenue * base);
}

const PROPERTY_YIELD: Record<string, number> = {
  Madrid: 0.058,
  Barcelona: 0.06,
  Lisbon: 0.063,
  Milan: 0.061,
  Zurich: 0.05,
  Paris: 0.052,
  Marbella: 0.059,
  Valencia: 0.064,
};

function propertyYieldFor(city: string): number {
  return PROPERTY_YIELD[city] ?? 0.068;
}

function marketTier(inst: InstitutionSeed): 1 | 2 | 3 {
  const tier1 = ["Madrid", "Barcelona", "Lisbon", "Milan", "Paris", "Zurich", "Dubai"];
  const tier2 = ["Valencia", "Seville", "Bilbao", "Málaga", "Marbella", "Porto", "Rome", "Lyon", "Alcobendas", "Las Rozas"];
  if (tier1.includes(inst.city)) return 1;
  if (tier2.includes(inst.city)) return 2;
  return 3;
}

async function main() {
  console.log("Terra OS — seeding demo database\n");

  // ── Reset ─────────────────────────────────────────────────────────────────
  const tables = [
    "InteractionParticipant", "Interaction", "Relationship", "Match", "BuyerCriteria",
    "InvestorMandate", "IntelligenceLink", "IntelligenceItem", "Signal", "RiskFlag",
    "StakeholderContinuity", "ProcessItem", "BuyerUniverseEntry", "DealStageHistory",
    "DealParticipant", "DealAsset", "InvestmentReturnScenario", "Deal", "Opportunity",
    "ScoreOverride", "StructureScenario", "Valuation", "Projection", "FinancialRecord",
    "FounderObjectiveRank", "FounderProfile", "OwnershipStake", "Campus", "Property",
    "Document", "Note", "Task", "DataFieldEvidence", "TransactionComparable",
    "EducationInstitution", "Person", "Family", "Organisation", "Source", "AuditLog",
    "SavedView", "ScoringWeights", "User",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }

  // ── Sources ───────────────────────────────────────────────────────────────
  const sourceNames = [
    "Terra research", "Registro Mercantil", "School website", "Published fee schedule",
    "Local press", "Regional newspaper", "Sector press", "Company announcement",
    "Company register", "Land registry filing", "Filed accounts", "Municipal planning register",
    "Recruitment portal", "Founder interview", "Direct conversation", "School newsletter",
    "COBIS register", "Property listing", "Regional business review", "HM Treasury",
    "Terra analysis", "Terra comparable set", "Property press", "School announcement",
    "Management information",
  ];
  const sources = new Map<string, string>();
  for (const name of sourceNames) {
    const created = await prisma.source.create({
      data: {
        name,
        kind: name.includes("Terra") ? "internal" : name.includes("registry") || name.includes("register") ? "registry" : "press",
        sourcedAt: monthsAgo(Math.round(jitter(name) * 14)),
      },
    });
    sources.set(name, created.id);
  }
  const sourceId = (name: string) => sources.get(name) ?? sources.get("Terra research")!;

  // ── Users ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("terra", 10);
  const userDefs = [
    { email: "fouad@terracapital.es", name: "Fouad Nasr", role: "MANAGING_PARTNER" as const, title: "Managing Partner" },
    { email: "elena@terracapital.es", name: "Elena Márquez", role: "PARTNER" as const, title: "Partner" },
    { email: "tomas@terracapital.es", name: "Tomás Rivera", role: "ASSOCIATE" as const, title: "Associate" },
    { email: "sofia@terracapital.es", name: "Sofia Lange", role: "ANALYST" as const, title: "Analyst" },
    { email: "admin@terracapital.es", name: "System Administrator", role: "ADMIN" as const, title: "Administrator" },
  ];
  const users = new Map<string, string>();
  for (const def of userDefs) {
    const u = await prisma.user.create({
      data: {
        email: def.email,
        name: def.name,
        role: def.role,
        title: def.title,
        passwordHash,
        initials: def.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      },
    });
    users.set(def.email, u.id);
  }
  const fouad = users.get("fouad@terracapital.es")!;
  const elena = users.get("elena@terracapital.es")!;
  const tomas = users.get("tomas@terracapital.es")!;
  const sofia = users.get("sofia@terracapital.es")!;
  console.log(`  ${userDefs.length} users`);

  // ── Families ──────────────────────────────────────────────────────────────
  const familyNames = new Set<string>();
  for (const i of INSTITUTIONS) if (i.familyName) familyNames.add(i.familyName);
  for (const p of PEOPLE) if (p.family) familyNames.add(p.family);
  const families = new Map<string, string>();
  for (const name of familyNames) {
    const f = await prisma.family.create({ data: { name } });
    families.set(name, f.id);
  }

  // ── Organisations, mandates, criteria ─────────────────────────────────────
  const organisations = new Map<string, string>();
  const orgRelationship = new Map<string, number>();
  const orgMeta = new Map<string, { platforms: string[]; patterns: InstitutionType[] }>();
  let mandateCount = 0;
  for (const org of ORGANISATIONS) {
    const created = await prisma.organisation.create({
      data: {
        slug: slugify(org.name),
        name: org.name,
        type: org.type,
        hq: org.hq,
        country: org.country,
        website: org.website,
        aum: org.aum,
        aumNote: org.aumNote,
        countriesActive: org.countriesActive,
        educationExposure: org.educationExposure,
        relevantInvestments: org.relevantInvestments ?? [],
        summary: org.summary,
        isPublicExample: org.isPublicExample ?? false,
      },
    });
    organisations.set(org.name, created.id);
    orgRelationship.set(org.name, org.relationship);
    orgMeta.set(org.name, {
      platforms: org.existingPlatforms ?? [],
      patterns: org.acquisitionPatterns ?? [],
    });

    for (const m of org.mandates ?? []) {
      const mandate = await prisma.investorMandate.create({
        data: {
          organisationId: created.id,
          name: m.name,
          status: m.status,
          isActive: m.status === "ACTIVE",
          strategy: m.strategy,
          notes: m.notes,
          startDate: monthsAgo(m.startMonthsAgo),
          lastConfirmed: monthsAgo(m.lastConfirmedMonthsAgo),
          ownerUserId: org.relationship >= 4 ? fouad : elena,
        },
      });
      await prisma.buyerCriteria.create({
        data: {
          mandateId: mandate.id,
          minEv: m.minEv,
          maxEv: m.maxEv,
          minEbitda: m.minEbitda,
          maxEbitda: m.maxEbitda,
          minStudents: m.minStudents,
          maxStudents: m.maxStudents,
          equityCheque: m.equityCheque,
          targetOwnershipPct: m.targetOwnershipPct,
          control: m.control,
          countries: m.countries,
          regions: m.regions,
          segments: m.segments,
          curricula: m.curricula,
          propertyPreference: m.propertyPreference,
          requiresOwnedProperty: m.requiresOwnedProperty ?? false,
          leaseAcceptable: m.leaseAcceptable ?? true,
          returnTarget: m.returnTarget,
          holdingPeriod: m.holdingPeriod,
          platformStrategy: m.platformStrategy,
          esgRequirements: m.esgRequirements,
          otherNotes: m.notes,
        },
      });
      mandateCount++;
    }
  }
  console.log(`  ${ORGANISATIONS.length} organisations, ${mandateCount} mandates`);

  // ── Institutions ──────────────────────────────────────────────────────────
  const institutions = new Map<string, string>();
  const institutionData = new Map<string, { seed: InstitutionSeed; revenue: number; ebitda: number; marketRent: number; propertyValue: number; ev: number }>();

  for (const inst of INSTITUTIONS) {
    const slug = slugify(inst.name);
    const revenue = revenueFor(inst, inst.students);
    const ebitda = Math.round(revenue * inst.margin);
    const marketRent = marketRentFor(inst, revenue);
    const yieldRate = propertyYieldFor(inst.city);
    const owned = inst.tenure === "OWNED" || inst.tenure === "MIXED";
    const propertyValue = owned ? Math.round(marketRent / yieldRate) : 0;
    // Indicative EV used for matching: OpCo on a rent-adjusted basis, plus PropCo.
    const opcoEbitda = owned ? ebitda - marketRent : ebitda;
    const ev = Math.max(0, Math.round(opcoEbitda * 10.5)) + propertyValue;

    const created = await prisma.educationInstitution.create({
      data: {
        slug,
        name: inst.name,
        legalName: inst.legalName,
        website: `https://www.${slug}.example`,
        country: inst.country,
        region: inst.region,
        city: inst.city,
        latitude: inst.lat,
        longitude: inst.lng,
        foundedYear: inst.founded,
        type: inst.type,
        curriculum: inst.curriculum,
        languages: inst.languages,
        accreditations: inst.accreditations ?? [],
        campusCount: inst.campusCount ?? 1,
        students: inst.students,
        capacity: inst.capacity,
        utilisation: Math.round((inst.students / inst.capacity) * 10000) / 10000,
        tuitionLow: inst.tuitionLow,
        tuitionHigh: inst.tuitionHigh,
        tuitionAverage: averageTuition(inst),
        teachers: Math.round(inst.students / (inst.studentTeacherRatio ?? 12)),
        employees: Math.round((inst.students / (inst.studentTeacherRatio ?? 12)) * 1.45),
        studentTeacherRatio: inst.studentTeacherRatio ?? 12,
        ownershipType: inst.ownershipType,
        ownerNames: inst.ownerNames ?? (inst.familyName ? [`${inst.familyName} family`] : []),
        familyName: inst.familyName,
        generation: inst.generation,
        founderAge: inst.founderAge,
        successionStatus: inst.succession,
        tenure: inst.tenure,
        summary: inst.summary,
        organisationId: inst.ownerNames?.[0] ? organisations.get(inst.ownerNames[0]) ?? null : null,
      },
    });
    institutions.set(inst.name, created.id);
    institutionData.set(inst.name, { seed: inst, revenue, ebitda, marketRent, propertyValue, ev });

    // Campuses
    const campusCount = inst.campusCount ?? 1;
    for (let c = 0; c < campusCount; c++) {
      await prisma.campus.create({
        data: {
          institutionId: created.id,
          name: campusCount === 1 ? `${inst.name} — ${inst.city}` : `${inst.name} — campus ${c + 1}`,
          city: inst.city,
          latitude: inst.lat + (c === 0 ? 0 : (jitter(`${slug}${c}`) - 0.5) * 0.08),
          longitude: inst.lng + (c === 0 ? 0 : (jitter(`${slug}${c}lng`) - 0.5) * 0.08),
          students: Math.round(inst.students / campusCount),
          capacity: Math.round(inst.capacity / campusCount),
          isPrimary: c === 0,
          tenure: inst.tenure,
        },
      });
    }

    // Property layer — only where there is a freehold to describe.
    if (owned) {
      const tags: Prisma.PropertyCreateInput["tags"] = [];
      tags.push("PROPCO_SEPARATION_POSSIBLE");
      if (ebitda - marketRent > 0 && propertyValue > 5_000_000) tags.push("SALE_LEASEBACK_CANDIDATE");
      if (propertyValue > 12_000_000) tags.push("INSTITUTIONAL_RE_BUYER_CANDIDATE");
      if (inst.students / inst.capacity < 0.75) tags.push("UNDERUTILISED_PROPERTY");
      // One threshold decides both the tag and the prose, so the property
      // panel cannot contradict itself.
      const hasSiteHeadroom = (inst.plotSqm ?? 0) > (inst.builtAreaSqm ?? 0) * 2;
      if (hasSiteHeadroom || inst.adjacentLand) tags.push("DEVELOPMENT_OPPORTUNITY");
      if (inst.students / inst.capacity > 0.9) tags.push("EXPANSION_CAPEX_REQUIRED");

      await prisma.property.create({
        data: {
          institutionId: created.id,
          name: `${inst.name} campus`,
          city: inst.city,
          country: inst.country,
          tenure: inst.tenure,
          propertyOwner: inst.familyName ? `${inst.familyName} family holding` : inst.name,
          ownerOrgId: inst.name === "Colegio Monteverde" ? organisations.get("Serra Patrimonio") : undefined,
          builtAreaSqm: inst.builtAreaSqm,
          plotSizeSqm: inst.plotSqm,
          landAreaSqm: inst.plotSqm,
          siteCount: inst.campusCount ?? 1,
          valueEstimateLow: Math.round(propertyValue * 0.9),
          valueEstimateHigh: Math.round(propertyValue * 1.12),
          marketRentEstimate: marketRent,
          annualRent: inst.tenure === "MIXED" ? rentFor(inst, revenue) : 0,
          rentToRevenue: Math.round((marketRent / revenue) * 10000) / 10000,
          rentToEbitda: ebitda > 0 ? Math.round((marketRent / ebitda) * 10000) / 10000 : null,
          expansionPotential: [
            hasSiteHeadroom
              ? "Material undeveloped land within the site boundary."
              : "Limited headroom within the existing footprint.",
            inst.adjacentLand ? "Ownership also controls land beyond the boundary." : null,
          ]
            .filter(Boolean)
            .join(" "),
          adjacentLand: inst.adjacentLand ?? false,
          condition: jitter(slug) > 0.7 ? "Requires investment" : "Good",
          maintenanceCapex: Math.round(revenue * 0.02),
          zoningNotes: "Educational use. Terra estimate — not verified against the municipal plan.",
          tags,
        },
      });
    } else {
      await prisma.property.create({
        data: {
          institutionId: created.id,
          name: `${inst.name} campus (leasehold)`,
          city: inst.city,
          country: inst.country,
          tenure: "LEASED",
          propertyOwner: "Third-party landlord",
          annualRent: rentFor(inst, revenue),
          marketRentEstimate: rentFor(inst, revenue),
          leaseExpiry: new Date(NOW.getFullYear() + Math.round(4 + jitter(slug) * 14), 7, 31),
          leaseTermYears: Math.round(4 + jitter(slug) * 14),
          indexation: "CPI-linked, capped at 3%",
          rentToRevenue: Math.round((rentFor(inst, revenue) / revenue) * 10000) / 10000,
          tags: ["EXPANSION_CAPEX_REQUIRED"],
        },
      });
    }

    // Financial history — three actuals plus the current year.
    for (let back = 3; back >= 0; back--) {
      const year = NOW.getFullYear() - back;
      const scale = 1 / (1 + inst.growth) ** back;
      const students = Math.round(inst.students * scale);
      const rev = revenueFor(inst, students);
      // Margin builds modestly with scale, as it does in reality.
      const margin = inst.margin - back * 0.006;
      const eb = Math.round(rev * margin);
      const rent = rentFor(inst, rev);
      await prisma.financialRecord.create({
        data: {
          institutionId: created.id,
          year,
          basis: back === 0 ? "TERRA_ESTIMATE" : "TERRA_ESTIMATE",
          revenue: rev,
          revenueGrowth: back === 3 ? null : Math.round(inst.growth * 10000) / 10000,
          ebitda: eb,
          ebitdaMargin: Math.round(margin * 10000) / 10000,
          ebit: Math.round(eb - rev * 0.028),
          netIncome: Math.round((eb - rev * 0.028) * 0.75),
          netDebt: Math.round(rev * (inst.tenure === "OWNED" ? 0.22 : 0.08)),
          cash: Math.round(rev * 0.09),
          capex: Math.round(rev * 0.032),
          workingCapital: Math.round(rev * -0.06),
          students,
          averageTuition: averageTuition(inst),
          rent,
          note:
            back === 0
              ? "Terra estimate built from published fees, observed enrolment and segment margin benchmarks."
              : "Terra estimate — historical build.",
          sourceRef: "Terra analysis",
        },
      });
    }

    // Ownership stakes
    if (inst.familyName && families.has(inst.familyName)) {
      await prisma.ownershipStake.create({
        data: {
          institutionId: created.id,
          holderName: `${inst.familyName} family`,
          percentage: inst.ownershipType === "FOUNDER" ? 1 : 0.82,
          role: inst.ownershipType === "FOUNDER" ? "Founder" : "Family shareholders",
          from: new Date(inst.founded, 8, 1),
          confidence: "ESTIMATED",
        },
      });
      if (inst.ownershipType === "FAMILY") {
        await prisma.ownershipStake.create({
          data: {
            institutionId: created.id,
            holderName: "Minority shareholders",
            percentage: 0.18,
            role: "Minority",
            from: new Date(inst.founded + 12, 8, 1),
            confidence: "UNVERIFIED",
          },
        });
      }
    } else if (inst.ownerNames?.[0] && organisations.has(inst.ownerNames[0])) {
      await prisma.ownershipStake.create({
        data: {
          institutionId: created.id,
          organisationId: organisations.get(inst.ownerNames[0])!,
          holderName: inst.ownerNames[0],
          percentage: 1,
          role: "Institutional owner",
          from: monthsAgo(58),
          confidence: "HIGH_CONFIDENCE",
        },
      });
      // Historical ownership is preserved, never overwritten.
      await prisma.ownershipStake.create({
        data: {
          institutionId: created.id,
          holderName: "Founding family",
          percentage: 1,
          role: "Former owner",
          from: new Date(inst.founded, 8, 1),
          to: monthsAgo(58),
          confidence: "HIGH_CONFIDENCE",
        },
      });
    }

    // Field-level evidence — the source/inference discipline made concrete.
    const evidence: {
      field: string;
      value: string;
      assertion: "FACT" | "ESTIMATE" | "SIGNAL" | "TERRA_HYPOTHESIS";
      confidence: Confidence;
      source: string;
      monthsOld: number;
    }[] = [
      { field: "students", value: String(inst.students), assertion: "ESTIMATE", confidence: "ESTIMATED", source: "Terra research", monthsOld: Math.round(jitter(slug + "s") * 26) },
      { field: "foundedYear", value: String(inst.founded), assertion: "FACT", confidence: "VERIFIED", source: "School website", monthsOld: 2 },
      { field: "tuitionAverage", value: String(averageTuition(inst)), assertion: "ESTIMATE", confidence: "HIGH_CONFIDENCE", source: "Published fee schedule", monthsOld: Math.round(jitter(slug + "t") * 14) },
      { field: "ownershipType", value: inst.ownershipType, assertion: "FACT", confidence: inst.familyName ? "HIGH_CONFIDENCE" : "ESTIMATED", source: "Registro Mercantil", monthsOld: Math.round(jitter(slug + "o") * 20) },
      { field: "revenue", value: String(revenue), assertion: "ESTIMATE", confidence: "ESTIMATED", source: "Terra analysis", monthsOld: 1 },
      { field: "tenure", value: inst.tenure, assertion: inst.tenure === "UNKNOWN" ? "ESTIMATE" : "FACT", confidence: inst.tenure === "UNKNOWN" ? "UNVERIFIED" : "HIGH_CONFIDENCE", source: "Land registry filing", monthsOld: Math.round(jitter(slug + "l") * 30) },
    ];
    if (inst.founderAge) {
      evidence.push({ field: "founderAge", value: String(inst.founderAge), assertion: "ESTIMATE", confidence: "ESTIMATED", source: "Terra research", monthsOld: 6 });
    }
    if (inst.succession !== "UNKNOWN") {
      evidence.push({
        field: "successionStatus",
        value: inst.succession,
        assertion: "TERRA_HYPOTHESIS",
        confidence: "ESTIMATED",
        source: "Terra research",
        monthsOld: 3,
      });
    }
    for (const e of evidence) {
      await prisma.dataFieldEvidence.create({
        data: {
          entityType: "EducationInstitution",
          entityId: created.id,
          field: e.field,
          value: e.value,
          assertion: e.assertion,
          confidence: e.confidence,
          sourceId: sourceId(e.source),
          lastReviewed: monthsAgo(e.monthsOld),
          verifiedAt: e.confidence === "VERIFIED" ? monthsAgo(e.monthsOld) : null,
          verifiedBy: e.confidence === "VERIFIED" ? "Sofia Lange" : null,
        },
      });
    }

    // Risk flags — always with a rationale.
    const util = inst.students / inst.capacity;
    if (inst.growth < 0) {
      await prisma.riskFlag.create({
        data: {
          institutionId: created.id,
          type: "ENROLLMENT_DECLINE",
          severity: inst.growth < -0.025 ? "HIGH" : "MODERATE",
          rationale: `Estimated enrolment has fallen at ${Math.abs(Math.round(inst.growth * 1000) / 10)}% a year. Value erodes while ownership waits.`,
          raisedBy: "Terra research",
        },
      });
    }
    if (inst.margin < 0.13) {
      await prisma.riskFlag.create({
        data: {
          institutionId: created.id,
          type: "WEAK_MARGINS",
          severity: inst.margin < 0.1 ? "HIGH" : "MODERATE",
          rationale: `Estimated EBITDA margin of ${Math.round(inst.margin * 100)}% sits below the ${Math.round(0.2 * 100)}% segment benchmark.`,
          mitigation: "Pricing and staff-ratio review before any process.",
        },
      });
    }
    if (inst.founderAge && inst.founderAge >= 65 && inst.succession !== "NEXT_GENERATION_ACTIVE") {
      await prisma.riskFlag.create({
        data: {
          institutionId: created.id,
          type: "FOUNDER_DEPENDENCY",
          severity: inst.founderAge >= 72 ? "HIGH" : "MODERATE",
          rationale: `The founder is ${inst.founderAge} and remains central to the institution's identity and relationships.`,
          mitigation: "Management depth below the founder needs to be evidenced early in any process.",
        },
      });
      await prisma.riskFlag.create({
        data: {
          institutionId: created.id,
          type: "SUCCESSION",
          severity: inst.succession === "POTENTIAL_SUCCESSION_ISSUE" ? "HIGH" : "MODERATE",
          rationale: "No identified successor inside the family with an operating role.",
        },
      });
    }
    if (inst.tenure === "LEASED") {
      await prisma.riskFlag.create({
        data: {
          institutionId: created.id,
          type: "LEASE_EXPIRY",
          severity: "MODERATE",
          rationale: "Operating from leasehold premises. Lease terms govern transferability and must be diligenced early.",
        },
      });
    }
    if (util > 0.93) {
      await prisma.riskFlag.create({
        data: {
          institutionId: created.id,
          type: "PROPERTY_CONSTRAINT",
          severity: "MODERATE",
          rationale: `At ${Math.round(util * 100)}% utilisation there is little room to grow enrolment without capital expenditure.`,
        },
      });
    }
  }
  console.log(`  ${INSTITUTIONS.length} institutions with campuses, property, financials, evidence and risk flags`);

  // ── People ────────────────────────────────────────────────────────────────
  const people = new Map<string, string>();
  async function createPerson(p: PersonSeed) {
    const full = `${p.firstName} ${p.lastName}`;
    const created = await prisma.person.create({
      data: {
        slug: slugify(full),
        firstName: p.firstName,
        lastName: p.lastName,
        title: p.title,
        email: p.email ?? `${slugify(p.firstName)}.${slugify(p.lastName)}@example.com`,
        phone: null,
        linkedin: `https://www.linkedin.com/in/${slugify(full)}`,
        languages: p.languages,
        location: p.location,
        professionalInterests: p.interests ?? [],
        notes: p.notes,
        isInternal: p.internal ?? false,
        organisationId: p.organisation ? organisations.get(p.organisation) : undefined,
        familyId: p.family ? families.get(p.family) : undefined,
      },
    });
    people.set(full, created.id);
    return created.id;
  }

  for (const p of TERRA_PEOPLE) {
    const id = await createPerson(p);
    const email = p.email!;
    if (users.has(email)) {
      await prisma.user.update({ where: { id: users.get(email)! }, data: { personId: id } });
    }
  }
  for (const p of PEOPLE) await createPerson(p);
  console.log(`  ${people.size} people`);

  const fouadPerson = people.get("Fouad Nasr")!;
  const elenaPerson = people.get("Elena Márquez")!;
  const tomasPerson = people.get("Tomás Rivera")!;
  const sofiaPerson = people.get("Sofia Lange")!;

  // ── Relationships ─────────────────────────────────────────────────────────
  // Terra's own network first, then the edges that connect people to the
  // institutions and organisations they actually control.
  let relationshipCount = 0;
  async function relate(
    fromPerson: string,
    to: { person?: string; organisation?: string; institution?: string },
    kind: Prisma.RelationshipCreateInput["kind"],
    strength: number,
    opts: { owner?: string; origin?: string; lastDaysAgo?: number; notes?: string; followUpInDays?: number } = {},
  ) {
    const fromId = people.get(fromPerson);
    if (!fromId) return;
    const toPersonId = to.person ? people.get(to.person) : undefined;
    const toOrgId = to.organisation ? organisations.get(to.organisation) : undefined;
    const toInstId = to.institution ? institutions.get(to.institution) : undefined;
    if (!toPersonId && !toOrgId && !toInstId) return;
    await prisma.relationship.create({
      data: {
        fromPersonId: fromId,
        toPersonId,
        toOrganisationId: toOrgId,
        toInstitutionId: toInstId,
        kind,
        strength,
        ownerUserId: opts.owner,
        origin: opts.origin,
        lastInteractionAt: opts.lastDaysAgo != null ? daysAgo(opts.lastDaysAgo) : null,
        nextFollowUpAt: opts.followUpInDays != null ? daysAhead(opts.followUpInDays) : null,
        notes: opts.notes,
      },
    });
    relationshipCount++;
  }

  // Terra → advisers and buy-side
  await relate("Fouad Nasr", { person: "Elena Vidal" }, "KNOWS", 5, { owner: fouad, origin: "Worked together on a family-business transaction in 2019", lastDaysAgo: 12, notes: "The most reliable route into Madrid family-owned schools." });
  await relate("Fouad Nasr", { person: "Inés Delgado" }, "KNOWS", 5, { owner: fouad, origin: "Former colleagues", lastDaysAgo: 6 });
  await relate("Fouad Nasr", { person: "Robert Nkemdirim" }, "KNOWS", 5, { owner: fouad, origin: "Introduced at an education conference in 2021", lastDaysAgo: 47, followUpInDays: 3, notes: "Has not been spoken to in 47 days. Fund III is actively deploying." });
  await relate("Fouad Nasr", { person: "Patricia Losada" }, "KNOWS", 5, { owner: fouad, origin: "Sale-and-leaseback mandate 2023", lastDaysAgo: 9 });
  await relate("Fouad Nasr", { person: "Nacho Vega" }, "KNOWS", 5, { owner: fouad, origin: "Advised on two acquisitions", lastDaysAgo: 4 });
  await relate("Fouad Nasr", { person: "Rebecca Ellison" }, "KNOWS", 4, { owner: fouad, origin: "Conference", lastDaysAgo: 34 });
  await relate("Fouad Nasr", { person: "Carlos Mendoza" }, "KNOWS", 4, { owner: fouad, lastDaysAgo: 21 });
  await relate("Fouad Nasr", { person: "Salvador Ripoll" }, "KNOWS", 4, { owner: fouad, origin: "Client referral", lastDaysAgo: 63, followUpInDays: 10 });
  await relate("Fouad Nasr", { person: "Montserrat Casals" }, "KNOWS", 4, { owner: fouad, lastDaysAgo: 28 });
  await relate("Fouad Nasr", { person: "Ricardo Peña" }, "KNOWS", 4, { owner: fouad, lastDaysAgo: 40 });
  await relate("Fouad Nasr", { person: "Andrés Cuéllar" }, "KNOWS", 4, { owner: fouad, origin: "Audits several Madrid family schools", lastDaysAgo: 55, notes: "Sees the accounts of half of family-owned Madrid before anyone else does." });
  await relate("Fouad Nasr", { person: "Marina Solís" }, "KNOWS", 4, { owner: fouad, lastDaysAgo: 31 });
  await relate("Fouad Nasr", { person: "Priya Raman" }, "KNOWS", 3, { owner: fouad, lastDaysAgo: 74 });
  await relate("Fouad Nasr", { person: "James Whitfield" }, "KNOWS", 3, { owner: fouad, lastDaysAgo: 91 });
  await relate("Fouad Nasr", { person: "Matteo Bellini" }, "KNOWS", 3, { owner: fouad, lastDaysAgo: 120 });
  await relate("Fouad Nasr", { person: "Omar Al Fahim" }, "KNOWS", 2, { owner: fouad, lastDaysAgo: 210 });
  await relate("Fouad Nasr", { person: "Ursula Steinmann" }, "KNOWS", 2, { owner: fouad, lastDaysAgo: 260 });
  await relate("Fouad Nasr", { person: "Khalid Al Muhairi" }, "KNOWS", 3, { owner: fouad, lastDaysAgo: 150 });
  await relate("Fouad Nasr", { person: "Bruno Ferrán" }, "KNOWS", 3, { owner: fouad, origin: "Property market", lastDaysAgo: 88 });

  await relate("Elena Márquez", { person: "Álex Ferrer" }, "KNOWS", 4, { owner: elena, lastDaysAgo: 18 });
  await relate("Elena Márquez", { person: "Sara Bermúdez" }, "KNOWS", 4, { owner: elena, lastDaysAgo: 11 });
  await relate("Elena Márquez", { person: "Guillermo Sáenz" }, "KNOWS", 4, { owner: elena, lastDaysAgo: 16 });
  await relate("Elena Márquez", { person: "Diego Rueda" }, "KNOWS", 3, { owner: elena, lastDaysAgo: 44 });
  await relate("Elena Márquez", { person: "Hannah Croft" }, "KNOWS", 4, { owner: elena, lastDaysAgo: 26 });
  await relate("Elena Márquez", { person: "Joana Almeida" }, "KNOWS", 3, { owner: elena, lastDaysAgo: 52 });
  await relate("Elena Márquez", { person: "Théo Lambert" }, "KNOWS", 3, { owner: elena, lastDaysAgo: 67 });
  await relate("Elena Márquez", { person: "Isabel Ruiz Weston" }, "KNOWS", 4, { owner: elena, origin: "Introduced by Andrés Cuéllar", lastDaysAgo: 38 });
  await relate("Elena Márquez", { person: "Cristina Aguirre" }, "KNOWS", 3, { owner: elena, lastDaysAgo: 96 });
  await relate("Elena Márquez", { person: "Willem de Vries" }, "KNOWS", 3, { owner: elena, lastDaysAgo: 58 });
  await relate("Tomás Rivera", { person: "Núria Camps" }, "KNOWS", 3, { owner: tomas, lastDaysAgo: 72 });
  await relate("Tomás Rivera", { person: "Rui Marques" }, "KNOWS", 3, { owner: tomas, origin: "Cold outreach that landed", lastDaysAgo: 41 });
  await relate("Tomás Rivera", { person: "Vicent Belda" }, "KNOWS", 3, { owner: tomas, lastDaysAgo: 35 });
  await relate("Tomás Rivera", { person: "Bea Lorenzo" }, "KNOWS", 3, { owner: tomas, lastDaysAgo: 29 });
  await relate("Tomás Rivera", { person: "Marc Mas" }, "KNOWS", 2, { owner: tomas, lastDaysAgo: 130 });
  await relate("Sofia Lange", { person: "Gonzalo Herrera" }, "KNOWS", 3, { owner: sofia, origin: "Met at a sector conference", lastDaysAgo: 24 });
  await relate("Sofia Lange", { person: "Aitor Garaikoetxea" }, "KNOWS", 2, { owner: sofia, lastDaysAgo: 110 });

  // Advisers → the founders they act for. These are the edges that matter.
  await relate("Elena Vidal", { person: "Ignacio Serra" }, "ADVISES", 4, { origin: "Corporate counsel to the family since 2011", notes: "Elena is the practical route to Ignacio." });
  await relate("Elena Vidal", { person: "Alfonso Villanueva" }, "ADVISES", 3);
  await relate("Elena Vidal", { person: "Nuria Bermejo" }, "ADVISES", 4);
  await relate("Andrés Cuéllar", { person: "Manuel Aguirre" }, "ADVISES", 4);
  await relate("Andrés Cuéllar", { person: "Rocío Cañizares" }, "ADVISES", 3);
  await relate("Andrés Cuéllar", { person: "Pilar Del Río" }, "ADVISES", 3);
  await relate("Andrés Cuéllar", { person: "Charles Weston" }, "ADVISES", 3);
  await relate("Ricardo Peña", { person: "Carmen Ortega" }, "ADVISES", 4);
  await relate("Ricardo Peña", { person: "Xoán Figueroa" }, "ADVISES", 3);
  await relate("Marina Solís", { person: "Adriana Iglesias" }, "ADVISES", 3);
  await relate("Marina Solís", { person: "Enrique Bergua" }, "ADVISES", 3);
  await relate("Bruno Ferrán", { person: "Ignacio Serra" }, "FAMILY", 4, { notes: "Runs the family's property holding company." });

  // Owners → their institutions.
  const ownerLinks: [string, string][] = [];
  for (const p of PEOPLE) {
    if (p.institution && /Founder|Chair|Owner|President|Director|Principal|CEO/i.test(p.title)) {
      ownerLinks.push([`${p.firstName} ${p.lastName}`, p.institution]);
    }
  }
  for (const [person, institution] of ownerLinks) {
    const isOwner = /Founder|Chair|Owner|President/i.test(
      PEOPLE.find((p) => `${p.firstName} ${p.lastName}` === person)?.title ?? "",
    );
    await relate(person, { institution }, isOwner ? "OWNS" : "WORKS_AT", 5);
  }
  // People inside buy-side organisations.
  for (const p of PEOPLE) {
    if (p.organisation) {
      await relate(`${p.firstName} ${p.lastName}`, { organisation: p.organisation }, "WORKS_AT", 5);
    }
  }
  // Family edges.
  await relate("Ignacio Serra", { person: "Marta Serra" }, "FAMILY", 5);
  await relate("Ignacio Serra", { person: "Pablo Serra" }, "FAMILY", 5);
  await relate("Ignacio Serra", { person: "Rosa Domínguez" }, "KNOWS", 5, { notes: "Appointed her; trusts her operationally." });
  await relate("Charles Weston", { person: "Isabel Ruiz Weston" }, "FAMILY", 5);
  await relate("Manuel Aguirre", { person: "Cristina Aguirre" }, "FAMILY", 5);
  await relate("Carmen Ortega", { person: "Luis Ortega" }, "FAMILY", 5);
  await relate("Alfonso Villanueva", { person: "Beatriz Villanueva" }, "FAMILY", 5);
  await relate("Alfonso Villanueva", { person: "Gonzalo Herrera" }, "KNOWS", 4);

  // Buy-side → the assets they already own.
  await relate("Robert Nkemdirim", { institution: "Highfield International Bilbao" }, "BACKED_BY", 5);
  await relate("Matteo Bellini", { institution: "Accademia Torino Business" }, "BACKED_BY", 5);
  await relate("Salvador Ripoll", { institution: "St. Andrew's College Murcia" }, "OWNS", 5);
  await relate("Nacho Vega", { organisation: "Vega Educación" }, "OWNS", 5);
  console.log(`  ${relationshipCount} relationships`);

  // ── Signals ───────────────────────────────────────────────────────────────
  for (const s of SIGNALS) {
    await prisma.signal.create({
      data: {
        type: s.type,
        date: monthsAgo(s.monthsAgo),
        institutionId: institutions.get(s.institution),
        entityLabel: s.institution,
        headline: s.headline,
        detail: s.detail,
        interpretation: s.interpretation,
        transactionImplication: s.implication,
        strength: s.strength,
        confidence: s.confidence,
        sourceId: sourceId(s.source),
      },
    });
  }
  console.log(`  ${SIGNALS.length} market signals`);

  // ── Comparables ───────────────────────────────────────────────────────────
  for (const c of COMPARABLES) {
    await prisma.transactionComparable.create({
      data: {
        target: c.target,
        buyer: c.buyer,
        country: c.country,
        date: monthsAgo(c.monthsAgo),
        segment: c.segment,
        ev: c.ev,
        revenue: c.revenue,
        ebitda: c.ebitda,
        evRevenue: Math.round((c.ev / c.revenue) * 100) / 100,
        evEbitda: Math.round((c.ev / c.ebitda) * 100) / 100,
        realEstateIncluded: c.realEstateIncluded,
        notes: c.notes,
        sourceId: sourceId("Sector press"),
      },
    });
  }
  console.log(`  ${COMPARABLES.length} precedent transactions`);

  // ── Intelligence ──────────────────────────────────────────────────────────
  for (const item of INTELLIGENCE) {
    const created = await prisma.intelligenceItem.create({
      data: {
        category: item.category,
        title: item.title,
        summary: item.summary,
        body: item.body,
        date: monthsAgo(item.monthsAgo),
        country: item.country,
        sourceId: sourceId(item.source),
      },
    });
    for (const name of item.institutions ?? []) {
      if (institutions.has(name)) {
        await prisma.intelligenceLink.create({
          data: { itemId: created.id, institutionId: institutions.get(name)! },
        });
      }
    }
    for (const name of item.organisations ?? []) {
      if (organisations.has(name)) {
        await prisma.intelligenceLink.create({
          data: { itemId: created.id, organisationId: organisations.get(name)! },
        });
      }
    }
  }
  console.log(`  ${INTELLIGENCE.length} intelligence items`);

  await seedOpportunitiesDealsAndViews({
    prisma, institutions, institutionData, organisations, people, users,
    fouad, elena, tomas, sofia, fouadPerson, elenaPerson, tomasPerson, sofiaPerson,
    orgRelationship, orgMeta, monthsAgo, daysAgo, daysAhead,
  });

  console.log("\nDone. Sign in with fouad@terracapital.es / terra\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
