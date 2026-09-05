/**
 * Opportunities, deals, interactions, matches and saved views.
 *
 * Split out of seed.ts to keep each file readable. Matches are computed by the
 * real match engine rather than hand-written, so the demo database and the
 * running product always agree.
 */

import type { PrismaClient, InstitutionType } from "@prisma/client";
import type { InstitutionSeed } from "./data/institutions";
import { rankMandatesForAsset, type AssetProfile, type MandateProfile } from "../src/lib/engine/matching";
import { modelAllStructures } from "../src/lib/engine/structures";
import { compSetStats, evFromMultiple, valueProperty } from "../src/lib/engine/valuation";

export interface SeedContext {
  prisma: PrismaClient;
  institutions: Map<string, string>;
  institutionData: Map<string, { seed: InstitutionSeed; revenue: number; ebitda: number; marketRent: number; propertyValue: number; ev: number }>;
  organisations: Map<string, string>;
  people: Map<string, string>;
  users: Map<string, string>;
  fouad: string;
  elena: string;
  tomas: string;
  sofia: string;
  fouadPerson: string;
  elenaPerson: string;
  tomasPerson: string;
  sofiaPerson: string;
  orgRelationship: Map<string, number>;
  orgMeta: Map<string, { platforms: string[]; patterns: InstitutionType[] }>;
  monthsAgo: (n: number) => Date;
  daysAgo: (n: number) => Date;
  daysAhead: (n: number) => Date;
}

export async function seedOpportunitiesDealsAndViews(ctx: SeedContext) {
  const { prisma, institutions, institutionData, organisations, people, monthsAgo, daysAgo, daysAhead } = ctx;

  // ── Founder legacy profiles ───────────────────────────────────────────────
  const founderProfiles: {
    institution: string;
    person?: string;
    narrative: string;
    objectives: { objective: string; rank: number }[];
  }[] = [
    {
      institution: "Colegio Monteverde",
      person: "Ignacio Serra",
      narrative:
        "Ignacio has said, more than once and to more than one person, that the school carrying his name into the next fifty years matters more to him than the last few million. He is not opposed to capital. He is opposed to disappearing.",
      objectives: [
        { objective: "MAINTAIN_NAME", rank: 1 },
        { objective: "MAINTAIN_CURRICULUM", rank: 2 },
        { objective: "EMPLOYEE_CONTINUITY", rank: 3 },
        { objective: "PARTIAL_LIQUIDITY", rank: 4 },
        { objective: "FAMILY_INVOLVEMENT", rank: 5 },
        { objective: "REMAIN_CHAIRMAN", rank: 6 },
        { objective: "MAXIMUM_VALUATION", rank: 7 },
        { objective: "REAL_ESTATE_RETENTION", rank: 8 },
      ],
    },
    {
      institution: "Colegio Puerta del Mar",
      person: "Anneke Kessler",
      narrative:
        "Anneke built the school from nothing in 2001 and has been explicit that she wants growth capital and a partner, not an exit.",
      objectives: [
        { objective: "GROWTH_CAPITAL", rank: 1 },
        { objective: "REMAIN_CHAIRMAN", rank: 2 },
        { objective: "PARTIAL_LIQUIDITY", rank: 3 },
        { objective: "MAINTAIN_CURRICULUM", rank: 4 },
        { objective: "MAXIMUM_VALUATION", rank: 5 },
      ],
    },
    {
      institution: "Colegio Villanueva",
      person: "Alfonso Villanueva",
      narrative:
        "The family has begun taking external advice and appears to be optimising for a clean, well-run process rather than the last euro of value.",
      objectives: [
        { objective: "MAXIMUM_VALUATION", rank: 1 },
        { objective: "EMPLOYEE_CONTINUITY", rank: 2 },
        { objective: "MAINTAIN_NAME", rank: 3 },
        { objective: "LONG_TERM_STEWARDSHIP", rank: 4 },
      ],
    },
    {
      institution: "Colegio Los Almendros",
      person: "Carmen Ortega",
      narrative:
        "Carmen owns the adjacent land personally and has been clear that the property stays in the family whatever happens to the school.",
      objectives: [
        { objective: "REAL_ESTATE_RETENTION", rank: 1 },
        { objective: "PARTIAL_LIQUIDITY", rank: 2 },
        { objective: "FAMILY_INVOLVEMENT", rank: 3 },
        { objective: "MAINTAIN_NAME", rank: 4 },
        { objective: "MAXIMUM_VALUATION", rank: 5 },
      ],
    },
  ];

  for (const fp of founderProfiles) {
    const institutionId = institutions.get(fp.institution);
    if (!institutionId) continue;
    const profile = await prisma.founderProfile.create({
      data: {
        institutionId,
        founderPersonId: fp.person ? people.get(fp.person) : undefined,
        narrative: fp.narrative,
      },
    });
    for (const o of fp.objectives) {
      await prisma.founderObjectiveRank.create({
        data: {
          profileId: profile.id,
          objective: o.objective as never,
          rank: o.rank,
        },
      });
    }
  }

  // ── Opportunities ─────────────────────────────────────────────────────────
  const opportunities: {
    institution: string;
    name: string;
    stage: string;
    type: string;
    owner: string;
    whyNow: string;
    nextAction: string;
    nextActionInDays: number;
    lastContactDaysAgo: number | null;
    probability: number;
    source: string;
    sourceNote?: string;
    thesis?: string;
  }[] = [
    {
      institution: "Colegio Monteverde",
      name: "Monteverde — founder succession",
      stage: "QUALIFIED",
      type: "MAJORITY_PARTNERSHIP",
      owner: ctx.fouad,
      whyNow:
        "The founder remains executive president at 68 and neither child holds an operating role. The campus is owned outright and the school is effectively full, so growth from here needs capital rather than marketing. Three operators currently hold live Madrid mandates.",
      nextAction: "Ask Elena Vidal to arrange a confidential introduction to Ignacio Serra",
      nextActionInDays: 4,
      lastContactDaysAgo: null,
      probability: 0.45,
      source: "TERRA_RESEARCH",
      sourceNote: "Identified through the Madrid family-ownership mapping exercise.",
      thesis:
        "Majority partnership with the OpCo, with the campus freehold monetised separately to an institutional owner. The founder takes liquidity, retains a minority, and the school keeps its name.",
    },
    {
      institution: "Colegio Villanueva",
      name: "Villanueva — two-campus group",
      stage: "MANDATE_DISCUSSION",
      type: "FULL_SALE",
      owner: ctx.elena,
      whyNow:
        "A non-family managing director was appointed in January and the family has begun taking external advice. Ownership and management have been deliberately separated, which in this segment almost always precedes a process.",
      nextAction: "Second meeting with Beatriz Villanueva and Gonzalo Herrera",
      nextActionInDays: 9,
      lastContactDaysAgo: 11,
      probability: 0.6,
      source: "RELATIONSHIP_REFERRAL",
      sourceNote: "Introduced by Elena Vidal.",
    },
    {
      institution: "Colegio Puerta del Mar",
      name: "Puerta del Mar — growth capital",
      stage: "LEAD",
      type: "MINORITY_GROWTH",
      owner: ctx.fouad,
      whyNow:
        "A planning application for a sixth-form building was filed six months ago and the founder has spoken publicly about finding a long-term partner. The school has the highest tuition and the strongest margins in the region.",
      nextAction: "Draft an approach note; identify a warm route to Anneke Kessler",
      nextActionInDays: 14,
      lastContactDaysAgo: null,
      probability: 0.25,
      source: "TERRA_RESEARCH",
    },
    {
      institution: "Colegio Los Almendros",
      name: "Los Almendros — PropCo separation",
      stage: "QUALIFIED",
      type: "SALE_LEASEBACK",
      owner: ctx.elena,
      whyNow:
        "The family bought the adjacent plot personally fourteen months ago, which tells us the property and the school are already separable in their minds. Enrolment is growing and the campus is owned outright.",
      nextAction: "Introduce Ricardo Peña's client to Patricia Losada",
      nextActionInDays: 6,
      lastContactDaysAgo: 22,
      probability: 0.4,
      source: "LAWYER",
      sourceNote: "Ricardo Peña acts for the Ortega family.",
    },
    {
      institution: "Highfield International Bilbao",
      name: "Highfield — sponsor exit",
      stage: "MANDATE_DISCUSSION",
      type: "FULL_SALE",
      owner: ctx.fouad,
      whyNow:
        "Northgate is in year five of its hold and refinanced the acquisition facility five months ago. Terra has a strong relationship with the fund and knows the asset.",
      nextAction: "Send indicative buyer universe to Robert Nkemdirim",
      nextActionInDays: 3,
      lastContactDaysAgo: 47,
      probability: 0.55,
      source: "INVESTOR_REQUEST",
    },
    {
      institution: "Colegio Cervantes Toledo",
      name: "Cervantes Toledo — succession",
      stage: "LEAD",
      type: "FULL_SALE",
      owner: ctx.tomas,
      whyNow:
        "The founder stepped back from the executive committee five months ago at 77. Both children work outside education. The campus is owned and the site is large relative to enrolment.",
      nextAction: "Ask Andrés Cuéllar whether an introduction is appropriate",
      nextActionInDays: 21,
      lastContactDaysAgo: null,
      probability: 0.2,
      source: "ACCOUNTANT",
    },
    {
      institution: "Escola Nova Lisboa",
      name: "Nova Lisboa — expansion capital",
      stage: "QUALIFIED",
      type: "MINORITY_GROWTH",
      owner: ctx.tomas,
      whyNow:
        "A second Lisbon site is under negotiation and the current campus is leased and near capacity. The founder is 57 and building, not exiting — this is a growth conversation, not a sale.",
      nextAction: "Model the two-site case and share with Rui Marques",
      nextActionInDays: 12,
      lastContactDaysAgo: 41,
      probability: 0.35,
      source: "TERRA_RESEARCH",
    },
    {
      institution: "Colegio Vigo Atlántico",
      name: "Vigo Atlántico — first conversation",
      stage: "LEAD",
      type: "MAJORITY_PARTNERSHIP",
      owner: ctx.sofia,
      whyNow:
        "The founder acknowledged an unresolved succession question in a regional business profile four months ago. Terra has no relationship here, which is the first thing to fix.",
      nextAction: "Identify a route through Ricardo Peña or the Galician banking network",
      nextActionInDays: 30,
      lastContactDaysAgo: null,
      probability: 0.12,
      source: "TERRA_RESEARCH",
    },
    {
      institution: "Instituto Tecnológico Levante",
      name: "Levante — vocational platform",
      stage: "ENGAGED",
      type: "MAJORITY_PARTNERSHIP",
      owner: ctx.tomas,
      whyNow:
        "Employer framework agreements signed three months ago materially de-risk the enrolment pipeline. Aurelia Capital is explicitly looking for a Spanish vocational platform and Terra knows both sides.",
      nextAction: "Circulate the information memorandum to Aurelia and two others",
      nextActionInDays: 5,
      lastContactDaysAgo: 8,
      probability: 0.7,
      source: "FOUNDER_INBOUND",
    },
    {
      institution: "Thames Valley Preparatory",
      name: "Thames Valley — distressed consolidation",
      stage: "PAUSED",
      type: "FULL_SALE",
      owner: ctx.elena,
      whyNow:
        "VAT on fees has moved the school from comfortable to marginal and the site is large relative to enrolment. Held pending clarity on whether the owner will accept a value that reflects current trading.",
      nextAction: "Revisit after the September intake is known",
      nextActionInDays: 60,
      lastContactDaysAgo: 78,
      probability: 0.15,
      source: "BROKER",
    },
  ];

  const opportunityIds = new Map<string, string>();
  for (const o of opportunities) {
    const institutionId = institutions.get(o.institution);
    if (!institutionId) continue;
    const data = institutionData.get(o.institution)!;
    const created = await prisma.opportunity.create({
      data: {
        institutionId,
        name: o.name,
        stage: o.stage as never,
        transactionType: o.type as never,
        estimatedEvLow: Math.round(data.ev * 0.88),
        estimatedEvHigh: Math.round(data.ev * 1.14),
        ownerUserId: o.owner,
        whyNow: o.whyNow,
        nextAction: o.nextAction,
        nextActionDate: daysAhead(o.nextActionInDays),
        lastContactAt: o.lastContactDaysAgo != null ? daysAgo(o.lastContactDaysAgo) : null,
        mandateProbability: o.probability,
        source: o.source as never,
        sourceNote: o.sourceNote,
        thesis: o.thesis,
      },
    });
    opportunityIds.set(o.institution, created.id);
  }
  console.log(`  ${opportunities.length} origination opportunities`);

  // ── Deals ─────────────────────────────────────────────────────────────────
  const PROCESS_TEMPLATE = [
    "Engagement letter",
    "NDA",
    "Information request",
    "Financial model",
    "Teaser",
    "Information memorandum",
    "Buyer list",
    "Management presentation",
    "Data room",
    "IOIs",
    "LOIs",
    "Due diligence",
    "SPA",
    "Signing",
    "Closing",
  ];

  const deals: {
    codeName: string;
    institution: string;
    type: string;
    stage: string;
    clientLabel: string;
    clientOrg?: string;
    lead: string;
    analyst: string;
    feePct: number;
    probability: number;
    closeInDays: number;
    blocker?: string;
    /** Historical deals do not claim the live opportunity on the same asset. */
    linkOpportunity?: boolean;
    processComplete: number;
    buyers: { org: string; stage: string; rationale: string; note?: string }[];
    stageHistory: { stage: string; monthsAgo: number }[];
  }[] = [
    {
      codeName: "Project Cervantes",
      institution: "Colegio Villanueva",
      type: "FULL_SALE",
      stage: "MARKETED",
      clientLabel: "Villanueva family",
      lead: ctx.elena,
      analyst: ctx.sofia,
      feePct: 0.021,
      probability: 0.65,
      closeInDays: 165,
      blocker: "Family alignment on whether the second campus is included in the perimeter.",
      processComplete: 9,
      buyers: [
        { org: "Cognita", stage: "CIM", rationale: "Existing Spanish platform; two-campus group fits the add-on programme precisely." },
        { org: "International Schools Partnership", stage: "CIM", rationale: "Stated Madrid density objective; scale is within band." },
        { org: "Globeducate", stage: "NDA", rationale: "Iberian consolidation mandate; bilingual positioning matches." },
        { org: "Vega Educación", stage: "NDA", rationale: "Domestic operator; would structure an earn-out with the family." },
        { org: "Northgate Education Partners", stage: "CONTACTED", rationale: "Platform mandate; a two-campus group is a credible platform entry." },
        { org: "Meridian Growth Partners", stage: "CONTACTED", rationale: "Seeking a first education platform in Iberia." },
        { org: "Inspired Education Group", stage: "APPROVED", rationale: "Premium mandate; positioning is arguably below their threshold." },
        { org: "Lusitania Educação", stage: "LONGLIST", rationale: "Cross-border ambition but limited Madrid relevance.", note: "Likely to decline on geography." },
        { org: "Iberian Schools Group", stage: "REJECTED", rationale: "Cannot fund a transaction of this size.", note: "Removed at the client's request." },
      ],
      stageHistory: [
        { stage: "LEAD", monthsAgo: 11 },
        { stage: "QUALIFIED", monthsAgo: 9 },
        { stage: "MANDATE_DISCUSSION", monthsAgo: 7 },
        { stage: "ENGAGED", monthsAgo: 5 },
        { stage: "PREPARATION", monthsAgo: 3 },
        { stage: "MARKETED", monthsAgo: 1 },
      ],
    },
    {
      codeName: "Project Bilbao",
      institution: "Highfield International Bilbao",
      type: "FULL_SALE",
      stage: "PREPARATION",
      clientLabel: "Northgate Education Partners",
      clientOrg: "Northgate Education Partners",
      lead: ctx.fouad,
      analyst: ctx.tomas,
      feePct: 0.018,
      probability: 0.5,
      closeInDays: 240,
      blocker: "Leasehold consent required from the landlord before a data room opens.",
      processComplete: 5,
      buyers: [
        { org: "Cognita", stage: "APPROVED", rationale: "Existing Spanish platform; Basque Country is a gap." },
        { org: "International Schools Partnership", stage: "APPROVED", rationale: "Bilingual and international segment fit." },
        { org: "Globeducate", stage: "LONGLIST", rationale: "Iberian consolidation mandate." },
        { org: "Vega Educación", stage: "LONGLIST", rationale: "Domestic operator; size is at the top of their band." },
        { org: "Aurelia Capital", stage: "LONGLIST", rationale: "Sector-adjacent; would need to stretch on segment." },
      ],
      stageHistory: [
        { stage: "LEAD", monthsAgo: 8 },
        { stage: "QUALIFIED", monthsAgo: 6 },
        { stage: "MANDATE_DISCUSSION", monthsAgo: 4 },
        { stage: "ENGAGED", monthsAgo: 2 },
        { stage: "PREPARATION", monthsAgo: 1 },
      ],
    },
    {
      codeName: "Project Alhambra",
      institution: "Colegio Los Almendros",
      type: "SALE_LEASEBACK",
      stage: "IOI",
      clientLabel: "Ortega family",
      lead: ctx.elena,
      analyst: ctx.sofia,
      feePct: 0.014,
      probability: 0.55,
      closeInDays: 120,
      blocker: "Lease term: the family wants 15 years, institutional buyers want 20.",
      processComplete: 10,
      buyers: [
        { org: "Iberian Social Infrastructure", stage: "IOI", rationale: "Core education-freehold mandate; targets exactly this covenant profile." },
        { org: "Castellana Real Assets", stage: "IOI", rationale: "Building an education allocation; competitive on price." },
        { org: "Baltrum Infrastructure", stage: "MANAGEMENT_MEETING", rationale: "Treats school campuses as long-duration social infrastructure." },
        { org: "Öresund Pension", stage: "REJECTED", rationale: "Allocation paused pending the 2026 asset review.", note: "Declined on timing, not on the asset." },
      ],
      stageHistory: [
        { stage: "LEAD", monthsAgo: 9 },
        { stage: "QUALIFIED", monthsAgo: 7 },
        { stage: "ENGAGED", monthsAgo: 5 },
        { stage: "MARKETED", monthsAgo: 3 },
        { stage: "IOI", monthsAgo: 1 },
      ],
    },
    {
      codeName: "Project Levante",
      institution: "Instituto Tecnológico Levante",
      type: "MAJORITY_PARTNERSHIP",
      stage: "DUE_DILIGENCE",
      clientLabel: "Vicent Belda",
      lead: ctx.fouad,
      analyst: ctx.tomas,
      feePct: 0.023,
      probability: 0.8,
      closeInDays: 75,
      blocker: "Quality-of-earnings work on deferred tuition revenue recognition.",
      processComplete: 12,
      buyers: [
        { org: "Aurelia Capital", stage: "SELECTED", rationale: "Explicit vocational platform mandate; strongest fit in the market." },
        { org: "Meridian Growth Partners", stage: "LOI", rationale: "Iberian founder-partnership mandate; comfortable with 60/40." },
        { org: "Alpina Capital", stage: "DILIGENCE", rationale: "Training and higher-education add-on appetite." },
        { org: "Northgate Education Partners", stage: "REJECTED", rationale: "Passed — prefers K–12 over vocational in the current fund." },
      ],
      stageHistory: [
        { stage: "LEAD", monthsAgo: 14 },
        { stage: "QUALIFIED", monthsAgo: 12 },
        { stage: "MANDATE_DISCUSSION", monthsAgo: 10 },
        { stage: "ENGAGED", monthsAgo: 8 },
        { stage: "PREPARATION", monthsAgo: 6 },
        { stage: "MARKETED", monthsAgo: 4 },
        { stage: "IOI", monthsAgo: 3 },
        { stage: "LOI", monthsAgo: 2 },
        { stage: "DUE_DILIGENCE", monthsAgo: 1 },
      ],
    },
  ];

  // Two completed transactions, so the closed count and the repeat-client
  // measure on Command reflect a firm with a history rather than a blank slate.
  deals.push(
    {
      codeName: "Project Guadiana",
      institution: "Colegio Los Almendros",
      type: "MINORITY_GROWTH",
      stage: "CLOSED",
      clientLabel: "Ortega family",
      lead: ctx.elena,
      analyst: ctx.tomas,
      feePct: 0.019,
      probability: 1,
      closeInDays: -420,
      linkOpportunity: false,
      processComplete: 15,
      buyers: [
        { org: "Casa Ventura Family Office", stage: "SELECTED", rationale: "Patient minority capital; no forced exit." },
        { org: "Meridian Growth Partners", stage: "REJECTED", rationale: "Wanted majority control the family would not give." },
      ],
      stageHistory: [
        { stage: "ENGAGED", monthsAgo: 24 },
        { stage: "MARKETED", monthsAgo: 20 },
        { stage: "LOI", monthsAgo: 17 },
        { stage: "CLOSED", monthsAgo: 14 },
      ],
    },
    {
      codeName: "Project Tajo",
      institution: "Highfield International Bilbao",
      type: "FULL_SALE",
      stage: "CLOSED",
      clientLabel: "Northgate Education Partners",
      clientOrg: "Northgate Education Partners",
      lead: ctx.fouad,
      analyst: ctx.sofia,
      feePct: 0.02,
      probability: 1,
      closeInDays: -780,
      linkOpportunity: false,
      processComplete: 15,
      buyers: [
        { org: "Northgate Education Partners", stage: "SELECTED", rationale: "Buy-side mandate; Terra advised the acquirer." },
      ],
      stageHistory: [
        { stage: "ENGAGED", monthsAgo: 34 },
        { stage: "DUE_DILIGENCE", monthsAgo: 28 },
        { stage: "CLOSED", monthsAgo: 26 },
      ],
    },
  );

  const dealIds = new Map<string, string>();
  for (const d of deals) {
    const institutionId = institutions.get(d.institution);
    if (!institutionId) continue;
    const data = institutionData.get(d.institution)!;
    const expectedEv = d.type === "SALE_LEASEBACK" ? data.propertyValue : data.ev;

    const deal = await prisma.deal.create({
      data: {
        slug: d.codeName.toLowerCase().replace(/\s+/g, "-"),
        codeName: d.codeName,
        transactionType: d.type as never,
        stage: d.stage as never,
        clientLabel: d.clientLabel,
        clientOrgId: d.clientOrg ? organisations.get(d.clientOrg) : undefined,
        opportunityId: d.linkOpportunity === false ? undefined : opportunityIds.get(d.institution),
        leadPartnerId: d.lead,
        analystId: d.analyst,
        expectedEv,
        expectedFee: Math.round(expectedEv * d.feePct),
        feeStructure: `${(d.feePct * 100).toFixed(1)}% of enterprise value, against a monthly retainer credited at completion.`,
        probability: d.probability,
        targetClose: daysAhead(d.closeInDays),
        keyBlocker: d.blocker,
      },
    });
    dealIds.set(d.codeName, deal.id);

    await prisma.dealAsset.create({
      data: { dealId: deal.id, institutionId, label: d.institution },
    });

    for (const h of d.stageHistory) {
      await prisma.dealStageHistory.create({
        data: {
          dealId: deal.id,
          stage: h.stage as never,
          enteredAt: monthsAgo(h.monthsAgo),
          exitedAt:
            d.stageHistory[d.stageHistory.indexOf(h) + 1]
              ? monthsAgo(d.stageHistory[d.stageHistory.indexOf(h) + 1]!.monthsAgo)
              : null,
        },
      });
    }

    for (const [index, b] of d.buyers.entries()) {
      const organisationId = organisations.get(b.org);
      if (!organisationId) continue;
      await prisma.buyerUniverseEntry.create({
        data: {
          dealId: deal.id,
          organisationId,
          stage: b.stage as never,
          strategicRationale: b.rationale,
          relationshipStrength: ctx.orgRelationship.get(b.org) ?? 2,
          notes: b.note,
          sortIndex: index,
          ndaSignedAt: ["NDA", "CIM", "IOI", "MANAGEMENT_MEETING", "LOI", "DILIGENCE", "SELECTED"].includes(b.stage)
            ? monthsAgo(2)
            : null,
          teaserSentAt: ["CONTACTED", "NDA", "CIM", "IOI", "MANAGEMENT_MEETING", "LOI", "DILIGENCE", "SELECTED"].includes(b.stage)
            ? monthsAgo(3)
            : null,
          cimSentAt: ["CIM", "IOI", "MANAGEMENT_MEETING", "LOI", "DILIGENCE", "SELECTED"].includes(b.stage)
            ? monthsAgo(1)
            : null,
          ioiAt: ["IOI", "MANAGEMENT_MEETING", "LOI", "DILIGENCE", "SELECTED"].includes(b.stage) ? monthsAgo(1) : null,
          ioiValue: ["IOI", "MANAGEMENT_MEETING", "LOI", "DILIGENCE", "SELECTED"].includes(b.stage)
            ? Math.round(expectedEv * (0.92 + index * 0.04))
            : null,
          loiAt: ["LOI", "DILIGENCE", "SELECTED"].includes(b.stage) ? monthsAgo(1) : null,
          loiValue: ["LOI", "DILIGENCE", "SELECTED"].includes(b.stage)
            ? Math.round(expectedEv * (0.95 + index * 0.03))
            : null,
        },
      });
    }

    for (const [index, label] of PROCESS_TEMPLATE.entries()) {
      const complete = index < d.processComplete;
      const inProgress = index === d.processComplete;
      await prisma.processItem.create({
        data: {
          dealId: deal.id,
          label,
          sortIndex: index,
          status: complete ? "COMPLETE" : inProgress ? "IN_PROGRESS" : "NOT_STARTED",
          critical: ["Information memorandum", "IOIs", "LOIs", "SPA", "Signing"].includes(label),
          dueDate: daysAhead(index * 14 - d.processComplete * 14 + 10),
          ownerName: index < 6 ? "Terra" : "Terra / counsel",
        },
      });
    }

    const stakeholderGroups = ["STUDENTS", "TEACHERS_STAFF", "FAMILIES", "COMMUNITY", "FOUNDER_LEGACY"] as const;
    const stakeholderContent: Record<(typeof stakeholderGroups)[number], { impact: string; risk: string; mitigation: string }> = {
      STUDENTS: {
        impact: "No change to curriculum or year-group structure is contemplated.",
        risk: "Mid-year disruption if the transaction completes during an academic term.",
        mitigation: "Target completion in the summer window between academic years.",
      },
      TEACHERS_STAFF: {
        impact: "Employment transfers on existing terms under Spanish succession-of-undertaking rules.",
        risk: "Departure of senior teaching staff if the process becomes public early.",
        mitigation: "Retention arrangements for the leadership team agreed before marketing.",
      },
      FAMILIES: {
        impact: "Fee policy and admissions criteria continue unchanged in the first two years.",
        risk: "Withdrawal of families who chose the school for its independence.",
        mitigation: "Communication plan agreed with the buyer before announcement.",
      },
      COMMUNITY: {
        impact: "The school remains a local institution under its existing name.",
        risk: "Local perception of a family institution passing to a foreign owner.",
        mitigation: "Founder remains publicly associated with the school through the transition.",
      },
      FOUNDER_LEGACY: {
        impact: "Name, curriculum and founding principles preserved contractually.",
        risk: "Commitments that are not documented do not survive a change of buyer management.",
        mitigation: "Continuity undertakings written into the SPA with a defined minimum term.",
      },
    };
    for (const group of stakeholderGroups) {
      await prisma.stakeholderContinuity.create({
        data: { dealId: deal.id, group, ...stakeholderContent[group] },
      });
    }

    const docs = [
      { title: `${d.codeName} — Teaser`, type: "TEASER" },
      { title: `${d.codeName} — Information Memorandum`, type: "CIM" },
      { title: `${d.codeName} — Financial Model v4`, type: "FINANCIAL_MODEL" },
      { title: `${d.codeName} — Valuation Analysis`, type: "VALUATION" },
      { title: `${d.codeName} — Buyer List`, type: "BOARD_MATERIALS" },
      { title: `${d.codeName} — Engagement Letter`, type: "LEGAL" },
    ];
    for (const doc of docs) {
      await prisma.document.create({
        data: {
          title: doc.title,
          type: doc.type as never,
          dealId: deal.id,
          institutionId,
          version: "v1",
          confidential: doc.type === "CIM" || doc.type === "FINANCIAL_MODEL",
          uploadedBy: "Terra",
        },
      });
    }

    await prisma.task.create({
      data: {
        title: d.blocker ? `Resolve: ${d.blocker}` : `Advance ${d.codeName}`,
        dealId: deal.id,
        assigneeId: d.lead,
        priority: "HIGH",
        dueDate: daysAhead(7),
        status: "OPEN",
      },
    });
  }
  console.log(`  ${deals.length} deals with buyer universes, process checklists and stakeholder analysis`);

  // ── Interactions ──────────────────────────────────────────────────────────
  const interactions: {
    type: string;
    daysAgo: number;
    summary: string;
    participants: string[];
    institution?: string;
    organisation?: string;
    deal?: string;
    nextStep?: string;
    sentiment?: string;
    logger: string;
  }[] = [
    { type: "MEETING", daysAgo: 12, summary: "Coffee with Elena Vidal. She acts for the Serra family and confirmed the founder has begun thinking about the school's next twenty years. She will not make an introduction without knowing what Terra would say.", participants: ["Fouad Nasr", "Elena Vidal"], institution: "Colegio Monteverde", nextStep: "Send a one-page view of what a partnership could look like", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "CALL", daysAgo: 47, summary: "Robert Nkemdirim confirmed Fund III is actively deploying and asked to see Spanish K–12 with owned property. Discussed Highfield timing but he was non-committal.", participants: ["Fouad Nasr", "Robert Nkemdirim"], organisation: "Northgate Education Partners", nextStep: "Send indicative buyer universe for Highfield", sentiment: "NEUTRAL", logger: ctx.fouad },
    { type: "MEETING", daysAgo: 11, summary: "Second meeting with Beatriz Villanueva and Gonzalo Herrera. The family is aligned on a sale in principle; the open question is whether the second campus is inside the perimeter.", participants: ["Elena Márquez", "Beatriz Villanueva", "Gonzalo Herrera"], deal: "Project Cervantes", institution: "Colegio Villanueva", nextStep: "Model both perimeters and present next week", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "CALL", daysAgo: 9, summary: "Patricia Losada confirmed Iberian Social Infrastructure will bid on Los Almendros at a 5.9–6.1% net initial yield provided a 20-year term. She was clear that 15 years does not work for her committee.", participants: ["Fouad Nasr", "Patricia Losada"], deal: "Project Alhambra", organisation: "Iberian Social Infrastructure", nextStep: "Take the 20-year requirement back to the Ortega family", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "MEETING", daysAgo: 8, summary: "Site visit to Instituto Tecnológico Levante with Aurelia. Vicent Belda presented the employer framework agreements. Aurelia's diligence team focused on revenue recognition for deferred tuition.", participants: ["Fouad Nasr", "Tomás Rivera", "Vicent Belda", "Théo Lambert"], deal: "Project Levante", nextStep: "Commission quality-of-earnings work on deferred revenue", sentiment: "POSITIVE", logger: ctx.tomas },
    { type: "DINNER", daysAgo: 6, summary: "Dinner with Inés Delgado. Meridian is looking for its first education platform and would consider a 51% structure with the founder as chairman. Unusually flexible for a Spanish sponsor.", participants: ["Fouad Nasr", "Inés Delgado"], organisation: "Meridian Growth Partners", nextStep: "Send two founder-partnership situations", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "CALL", daysAgo: 4, summary: "Nacho Vega confirmed four to six further Spanish additions over 24 months, bilingual, 300–1,400 students, and will structure earn-outs where the founder stays two to three years.", participants: ["Fouad Nasr", "Nacho Vega"], organisation: "Vega Educación", nextStep: "Screen the Atlas for matching bilingual schools", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "EMAIL", daysAgo: 22, summary: "Ricardo Peña confirmed the Ortega family is willing to discuss the campus separately from the school, and that Carmen Ortega owns the adjacent plot personally.", participants: ["Elena Márquez", "Ricardo Peña"], institution: "Colegio Los Almendros", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "CONFERENCE", daysAgo: 34, summary: "Education investment conference, London. Spoke with Rebecca Ellison about Cognita's Iberian appetite. She confirmed the add-on programme remains funded and that they prefer to separate freehold at completion.", participants: ["Fouad Nasr", "Rebecca Ellison"], organisation: "Cognita", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "CALL", daysAgo: 41, summary: "Rui Marques described the second Lisbon site. He is building, not selling. A growth-capital conversation is the only relevant one here for the next three years.", participants: ["Tomás Rivera", "Rui Marques"], institution: "Escola Nova Lisboa", nextStep: "Model the two-site case", sentiment: "NEUTRAL", logger: ctx.tomas },
    { type: "MEETING", daysAgo: 55, summary: "Andrés Cuéllar over lunch. He audits several Madrid family schools and mentioned, without naming names, that two of his clients have asked him what a school is worth this year.", participants: ["Fouad Nasr", "Andrés Cuéllar"], nextStep: "Follow up in a month; do not push", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "NOTE", daysAgo: 3, summary: "Terra research: planning register shows a sixth-form application at Puerta del Mar. Combined with the founder's recent interview, this reads as a school preparing to invest rather than to sell.", participants: ["Sofia Lange"], institution: "Colegio Puerta del Mar", sentiment: "NEUTRAL", logger: ctx.sofia },
    { type: "INTRODUCTION", daysAgo: 18, summary: "Introduced Álex Ferrer at Globeducate to the Project Cervantes process. NDA signed the following week.", participants: ["Elena Márquez", "Álex Ferrer"], deal: "Project Cervantes", organisation: "Globeducate", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "NDA", daysAgo: 16, summary: "Globeducate NDA countersigned for Project Cervantes.", participants: ["Elena Márquez", "Álex Ferrer"], deal: "Project Cervantes", logger: ctx.elena },
    { type: "PROPOSAL", daysAgo: 63, summary: "Sent Salvador Ripoll an outline of what a sale of Iberian Schools Group would look like. No response yet — he is not ready.", participants: ["Fouad Nasr", "Salvador Ripoll"], organisation: "Iberian Schools Group", nextStep: "Leave it. Revisit in six months.", sentiment: "CAUTIOUS", logger: ctx.fouad },
    { type: "CALL", daysAgo: 26, summary: "Hannah Croft walked through Northgate's Highfield exit thinking. They will run a process but want the landlord consent resolved first.", participants: ["Elena Márquez", "Hannah Croft"], deal: "Project Bilbao", sentiment: "NEUTRAL", logger: ctx.elena },
    { type: "MEETING", daysAgo: 38, summary: "Isabel Ruiz Weston at Alcobendas. The family is not selling. Her father remains chairman and the school is performing. Worth knowing well regardless.", participants: ["Elena Márquez", "Isabel Ruiz Weston"], institution: "British College of Alcobendas", nextStep: "Annual check-in", sentiment: "NEUTRAL", logger: ctx.elena },
    { type: "CALL", daysAgo: 96, summary: "Cristina Aguirre at Mirasierra. She took over as head last year and is settling in. Succession is resolved internally; there is no transaction here.", participants: ["Elena Márquez", "Cristina Aguirre"], institution: "Colegio Mirasierra Bilingüe", sentiment: "NEUTRAL", logger: ctx.elena },
    { type: "EMAIL", daysAgo: 74, summary: "Priya Raman confirmed ISP's Spain expansion mandate is live and asked to be shown bilingual schools in secondary cities.", participants: ["Fouad Nasr", "Priya Raman"], organisation: "International Schools Partnership", nextStep: "Run a reverse match against the ISP mandate", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "MEETING", daysAgo: 29, summary: "Bea Lorenzo on the Little Acorns model. Six sites, all leased, growing fast. Too small today but exactly the kind of asset Meridian would back in two years.", participants: ["Tomás Rivera", "Bea Lorenzo"], institution: "Little Acorns Early Years Group", sentiment: "POSITIVE", logger: ctx.tomas },
    { type: "CALL", daysAgo: 44, summary: "Diego Rueda at Castellana. They are building an education allocation and want to see sale-and-leaseback opportunities with strong operating covenants.", participants: ["Elena Márquez", "Diego Rueda"], organisation: "Castellana Real Assets", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "CALL", daysAgo: 58, summary: "Willem de Vries at Baltrum. Infrastructure capital is now competing with real-estate capital for school campuses. He was explicit that they will hold for fifteen years or more.", participants: ["Elena Márquez", "Willem de Vries"], organisation: "Baltrum Infrastructure", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "MEETING", daysAgo: 24, summary: "Gonzalo Herrera one-to-one. He was appointed to professionalise the group and is candid that the family wants to step back within two years.", participants: ["Sofia Lange", "Gonzalo Herrera"], institution: "Colegio Villanueva", deal: "Project Cervantes", sentiment: "POSITIVE", logger: ctx.sofia },
    { type: "EMAIL", daysAgo: 91, summary: "James Whitfield confirmed Inspired's threshold is above where Cervantes is positioned. Polite pass.", participants: ["Fouad Nasr", "James Whitfield"], deal: "Project Cervantes", sentiment: "CAUTIOUS", logger: ctx.fouad },
    { type: "CALL", daysAgo: 31, summary: "Marina Solís on debt appetite for Spanish education. Banks will lend 3.0–3.5× EBITDA against owned property, materially less against leasehold.", participants: ["Fouad Nasr", "Marina Solís"], organisation: "Banco Ibérico Corporate", sentiment: "NEUTRAL", logger: ctx.fouad },
    { type: "MEETING", daysAgo: 35, summary: "Vicent Belda walked through the employer framework agreements. Three regional employers have committed placement pipelines, which materially de-risks the enrolment forecast.", participants: ["Tomás Rivera", "Vicent Belda"], institution: "Instituto Tecnológico Levante", deal: "Project Levante", sentiment: "POSITIVE", logger: ctx.tomas },
    { type: "DOCUMENT_SENT", daysAgo: 15, summary: "Information memorandum released to Cognita and ISP under NDA for Project Cervantes.", participants: ["Elena Márquez", "Rebecca Ellison", "Priya Raman"], deal: "Project Cervantes", logger: ctx.elena },
    { type: "MANDATE", daysAgo: 150, summary: "Engagement letter signed with the Villanueva family for Project Cervantes.", participants: ["Elena Márquez", "Beatriz Villanueva"], deal: "Project Cervantes", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "CALL", daysAgo: 88, summary: "Bruno Ferrán at Serra Patrimonio on the Monteverde campus. He confirmed the freehold sits in the family holding company, separate from the school entity.", participants: ["Fouad Nasr", "Bruno Ferrán"], institution: "Colegio Monteverde", sentiment: "NEUTRAL", logger: ctx.fouad },
    { type: "CONFERENCE", daysAgo: 120, summary: "Milan education summit. Brief conversation with Matteo Bellini at Alpina about southern European vocational assets.", participants: ["Fouad Nasr", "Matteo Bellini"], organisation: "Alpina Capital", sentiment: "NEUTRAL", logger: ctx.fouad },
    { type: "CALL", daysAgo: 21, summary: "Carlos Mendoza confirmed Cognita's Spain team has capacity for two more processes this year.", participants: ["Fouad Nasr", "Carlos Mendoza"], organisation: "Cognita", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "NOTE", daysAgo: 2, summary: "Terra research: Colegio Cervantes Toledo founder stepped back from the executive committee. No successor identified. Adding to origination.", participants: ["Tomás Rivera"], institution: "Colegio Cervantes Toledo", sentiment: "NEUTRAL", logger: ctx.tomas },
    { type: "MEETING", daysAgo: 16, summary: "Guillermo Sáenz walked through Meridian's education screen. They are looking at eight situations; two overlap with Terra's pipeline.", participants: ["Elena Márquez", "Guillermo Sáenz"], organisation: "Meridian Growth Partners", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "EMAIL", daysAgo: 52, summary: "Joana Almeida confirmed Lusitania's interest in Galicia and Castile but not Madrid.", participants: ["Elena Márquez", "Joana Almeida"], organisation: "Lusitania Educação", sentiment: "NEUTRAL", logger: ctx.elena },
    { type: "CALL", daysAgo: 67, summary: "Théo Lambert on Aurelia's vocational platform thesis. Spain is the priority market after France.", participants: ["Elena Márquez", "Théo Lambert"], organisation: "Aurelia Capital", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "MEETING", daysAgo: 28, summary: "Montserrat Casals at Casa Ventura. Patient capital, no fund clock, explicitly will not force an exit. The right partner for a founder who does not want to sell control.", participants: ["Fouad Nasr", "Montserrat Casals"], organisation: "Casa Ventura Family Office", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "CALL", daysAgo: 110, summary: "Aitor Garaikoetxea at Highfield. Operationally stable; he is aware ownership is thinking about timing.", participants: ["Sofia Lange", "Aitor Garaikoetxea"], institution: "Highfield International Bilbao", sentiment: "NEUTRAL", logger: ctx.sofia },
    { type: "NOTE", daysAgo: 5, summary: "Reverse match run against the ISP Spain mandate produced four institutions above 80 that Terra has not contacted. Two are in Andalusia.", participants: ["Sofia Lange"], sentiment: "POSITIVE", logger: ctx.sofia },
    { type: "CALL", daysAgo: 72, summary: "Núria Camps at Sant Jordi. Professional management is embedded; the Puig family is not contemplating anything.", participants: ["Tomás Rivera", "Núria Camps"], institution: "Institut Sant Jordi", sentiment: "NEUTRAL", logger: ctx.tomas },
    { type: "MEETING", daysAgo: 40, summary: "Ricardo Peña on family-business governance. He sees succession disputes early and is willing to flag situations where a third party would help.", participants: ["Fouad Nasr", "Ricardo Peña"], organisation: "Garrigues Peña Abogados", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "EMAIL", daysAgo: 150, summary: "Omar Al Fahim asked to be kept informed of European brand opportunities above €30m.", participants: ["Fouad Nasr", "Omar Al Fahim"], organisation: "Gulf Education Holdings", sentiment: "NEUTRAL", logger: ctx.fouad },
    { type: "CALL", daysAgo: 130, summary: "Marc Mas at Costa Brava. He mentioned marketing an undeveloped parcel inside the site boundary.", participants: ["Tomás Rivera", "Marc Mas"], institution: "Colegio Costa Brava", sentiment: "NEUTRAL", logger: ctx.tomas },
    { type: "MEETING", daysAgo: 78, summary: "Henry Aldridge at Thames Valley. VAT has moved the school from comfortable to marginal but his price expectation has not moved with it.", participants: ["Elena Márquez", "Henry Aldridge"], institution: "Thames Valley Preparatory", nextStep: "Revisit after the September intake", sentiment: "CAUTIOUS", logger: ctx.elena },
    { type: "CALL", daysAgo: 210, summary: "Introductory call with Omar Al Fahim's team. Exploratory only.", participants: ["Fouad Nasr", "Omar Al Fahim"], organisation: "Gulf Education Holdings", sentiment: "NEUTRAL", logger: ctx.fouad },
    { type: "NOTE", daysAgo: 1, summary: "Weekly origination review: Monteverde moved to Qualified. Access route through Elena Vidal confirmed as the primary path.", participants: ["Fouad Nasr", "Sofia Lange"], institution: "Colegio Monteverde", sentiment: "POSITIVE", logger: ctx.fouad },
    { type: "CALL", daysAgo: 33, summary: "Sara Bermúdez sent Vega's current acquisition criteria. Bilingual, 300–1,400 students, cities above 200,000.", participants: ["Elena Márquez", "Sara Bermúdez"], organisation: "Vega Educación", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "MEETING", daysAgo: 60, summary: "Ursula Steinmann in Zug. Helvetia is a long-hold buyer for premium alpine and DACH assets only. Not relevant to Iberia.", participants: ["Fouad Nasr", "Ursula Steinmann"], organisation: "Helvetia Bildung Holding", sentiment: "NEUTRAL", logger: ctx.fouad },
    { type: "CALL", daysAgo: 19, summary: "Andrés Cuéllar flagged that a Toledo client has asked about valuation. Did not name them. Terra hypothesis: Colegio Cervantes Toledo.", participants: ["Fouad Nasr", "Andrés Cuéllar"], sentiment: "POSITIVE", nextStep: "Do not push. Let him raise it again.", logger: ctx.fouad },
    { type: "EMAIL", daysAgo: 7, summary: "Patricia Losada asked for the Los Almendros lease structure in writing before her investment committee on the 14th.", participants: ["Elena Márquez", "Patricia Losada"], deal: "Project Alhambra", nextStep: "Send lease heads of terms", sentiment: "POSITIVE", logger: ctx.elena },
    { type: "MEETING", daysAgo: 45, summary: "Lunch with Lars Jensen at Öresund. Their real-assets allocation is paused pending the 2026 strategic review. Not a live counterparty this year.", participants: ["Fouad Nasr", "Lars Jensen"], organisation: "Öresund Pension", sentiment: "CAUTIOUS", logger: ctx.fouad },
    { type: "CALL", daysAgo: 13, summary: "Rosa Domínguez at Monteverde returned a call about a sector benchmarking exercise. Professional, guarded, and clearly not authorised to discuss ownership.", participants: ["Sofia Lange", "Rosa Domínguez"], institution: "Colegio Monteverde", sentiment: "NEUTRAL", logger: ctx.sofia },
  ];

  let interactionCount = 0;
  for (const i of interactions) {
    const created = await prisma.interaction.create({
      data: {
        type: i.type as never,
        date: daysAgo(i.daysAgo),
        summary: i.summary,
        nextStep: i.nextStep,
        followUpDate: i.nextStep ? daysAhead(14) : null,
        sentiment: (i.sentiment ?? "NEUTRAL") as never,
        loggedByUserId: i.logger,
        institutionId: i.institution ? institutions.get(i.institution) : undefined,
        organisationId: i.organisation ? organisations.get(i.organisation) : undefined,
        dealId: i.deal ? dealIds.get(i.deal) : undefined,
      },
    });
    for (const name of i.participants) {
      const personId = people.get(name);
      if (personId) {
        await prisma.interactionParticipant.create({
          data: { interactionId: created.id, personId },
        });
      }
    }
    interactionCount++;
  }
  console.log(`  ${interactionCount} interactions`);

  // ── Matches — computed by the real engine ─────────────────────────────────
  const mandateRecords = await prisma.investorMandate.findMany({
    include: { criteria: true, organisation: true },
  });
  const mandateProfiles: MandateProfile[] = mandateRecords
    .filter((m) => m.criteria)
    .map((m) => {
      const meta = ctx.orgMeta.get(m.organisation.name) ?? { platforms: [], patterns: [] };
      return {
        id: m.id,
        organisationId: m.organisationId,
        organisationName: m.organisation.name,
        organisationType: m.organisation.type,
        mandateName: m.name,
        isActive: m.isActive,
        countries: m.criteria!.countries,
        regions: m.criteria!.regions,
        segments: m.criteria!.segments,
        curricula: m.criteria!.curricula,
        minEv: m.criteria!.minEv,
        maxEv: m.criteria!.maxEv,
        minEbitda: m.criteria!.minEbitda,
        maxEbitda: m.criteria!.maxEbitda,
        minStudents: m.criteria!.minStudents,
        maxStudents: m.criteria!.maxStudents,
        control: m.criteria!.control,
        propertyPreference: m.criteria!.propertyPreference,
        requiresOwnedProperty: m.criteria!.requiresOwnedProperty,
        leaseAcceptable: m.criteria!.leaseAcceptable,
        platformStrategy: m.criteria!.platformStrategy,
        existingPlatforms: meta.platforms,
        acquisitionPatterns: meta.patterns,
        relationshipStrength: ctx.orgRelationship.get(m.organisation.name) ?? 2,
      };
    });

  let matchCount = 0;
  for (const [name, id] of institutions) {
    const data = institutionData.get(name)!;
    const inst = data.seed;
    const owned = inst.tenure === "OWNED" || inst.tenure === "MIXED";
    const asset: AssetProfile = {
      id,
      name,
      country: inst.country,
      region: inst.region,
      city: inst.city,
      type: inst.type,
      curriculum: inst.curriculum,
      students: inst.students,
      enterpriseValue: data.ev,
      ebitda: owned ? data.ebitda - data.marketRent : data.ebitda,
      tenure: inst.tenure,
      propertyValue: data.propertyValue || null,
      ownershipType: inst.ownershipType,
      relationshipStrength: 1,
    };
    const results = rankMandatesForAsset(asset, mandateProfiles, { includeDisqualified: true });
    for (const r of results) {
      // Storing every pair would be noise. Below 30 the answer is simply "no".
      if (r.score < 30) continue;
      await prisma.match.create({
        data: {
          institutionId: id,
          mandateId: r.mandateId,
          score: r.score,
          breakdown: {
            dimensions: r.dimensions,
            reasons: r.reasons,
            issues: r.issues,
            disqualified: r.disqualified,
          } as unknown as object,
        },
      });
      matchCount++;
    }
  }
  console.log(`  ${matchCount} computed matches`);

  // ── Valuations and structures for the hero asset ──────────────────────────
  const heroName = "Colegio Monteverde";
  const heroId = institutions.get(heroName)!;
  const hero = institutionData.get(heroName)!;
  const comps = await prisma.transactionComparable.findMany({
    where: { country: "Spain", segment: { in: ["K12", "BILINGUAL_SCHOOL", "INTERNATIONAL_SCHOOL"] } },
  });
  const stats = compSetStats(
    comps.map((c) => ({
      target: c.target,
      buyer: c.buyer,
      country: c.country,
      date: c.date,
      segment: c.segment,
      evEbitda: c.evEbitda,
      evRevenue: c.evRevenue,
      realEstateIncluded: c.realEstateIncluded,
    })),
  );
  const opcoEbitda = hero.ebitda - hero.marketRent;
  const opcoRange = evFromMultiple(
    opcoEbitda,
    stats.evEbitda?.low ?? 9,
    stats.evEbitda?.high ?? 12,
  );
  const propRange = valueProperty({ marketRent: hero.marketRent, yieldLow: 0.055, yieldHigh: 0.065 })!;

  await prisma.valuation.create({
    data: {
      institutionId: heroId,
      method: "TRANSACTION_COMPARABLES",
      low: opcoRange.low,
      high: opcoRange.high,
      note: "Operating company on a rent-adjusted basis.",
      assumptions: {
        basis: "EV / EBITDA against Iberian K–12 precedent transactions",
        ebitdaPreRent: hero.ebitda,
        marketRent: hero.marketRent,
        ebitdaAfterRent: opcoEbitda,
        multipleLow: stats.evEbitda?.low ?? 9,
        multipleHigh: stats.evEbitda?.high ?? 12,
        compCount: stats.count,
      },
    },
  });
  await prisma.valuation.create({
    data: {
      institutionId: heroId,
      method: "REAL_ESTATE",
      low: propRange.low,
      high: propRange.high,
      note: "Campus freehold capitalised on an estimated market rent.",
      assumptions: {
        basis: "Market rent capitalised at an institutional net initial yield",
        marketRent: hero.marketRent,
        yieldLow: 0.055,
        yieldHigh: 0.065,
        reference: "Four-campus Iberian PropCo portfolio transacted at 5.9% six months ago",
      },
    },
  });
  await prisma.valuation.create({
    data: {
      institutionId: heroId,
      method: "SUM_OF_THE_PARTS",
      low: opcoRange.low + propRange.low,
      high: opcoRange.high + propRange.high,
      note: "Operating company plus campus freehold.",
      assumptions: { opco: opcoRange, propco: propRange } as unknown as object,
    },
  });

  const structures = modelAllStructures({
    ebitdaPreRent: hero.ebitda,
    opcoMultiple: stats.evEbitda?.median ?? 10.5,
    marketRent: hero.marketRent,
    propertyYield: 0.058,
    existingNetDebt: Math.round(hero.revenue * 0.22),
    stakeSold: 0.7,
    growthCapital: 8_000_000,
    exitYears: 5,
    exitEbitdaGrowth: 0.07,
  });
  for (const s of structures) {
    await prisma.structureScenario.create({
      data: {
        institutionId: heroId,
        type: s.type,
        label: s.label,
        assumptions: {
          ebitdaPreRent: hero.ebitda,
          opcoMultiple: stats.evEbitda?.median ?? 10.5,
          marketRent: hero.marketRent,
          propertyYield: 0.058,
          stakeSold: 0.7,
        },
        output: s as unknown as object,
        note: s.description,
      },
    });
  }

  // ── Saved views ───────────────────────────────────────────────────────────
  const views = [
    { key: "madrid-k12", label: "Madrid K–12", module: "atlas", query: { region: "Madrid", type: ["K12", "BILINGUAL_SCHOOL"] } },
    { key: "founder-owned", label: "Founder Owned", module: "atlas", query: { ownershipType: ["FOUNDER", "FAMILY"] } },
    { key: "owned-real-estate", label: "Owned Real Estate", module: "atlas", query: { tenure: ["OWNED", "MIXED"] } },
    { key: "succession-watch", label: "Succession Watch", module: "atlas", query: { succession: ["POTENTIAL_SUCCESSION_ISSUE", "TRANSITION_UNDERWAY", "FOUNDER_LED"] } },
    { key: "active-buyer-match", label: "Active Buyer Match", module: "atlas", query: { minMatches: 2 } },
    { key: "uncontacted-high-score", label: "Uncontacted High Score", module: "atlas", query: { minScore: 70, uncontacted: true } },
    { key: "propco-opportunities", label: "PropCo Opportunities", module: "atlas", query: { tenure: ["OWNED"], minPropertyValue: 10000000 } },
  ];
  for (const v of views) {
    await prisma.savedView.create({
      data: { key: v.key, label: v.label, module: v.module, query: v.query, shared: true },
    });
  }

  await prisma.scoringWeights.create({
    data: {
      label: "Terra default",
      isDefault: true,
      weights: {
        strategic: 0.2,
        financial: 0.2,
        transactionLikelihood: 0.2,
        buyerDemand: 0.15,
        realEstate: 0.1,
        relationship: 0.15,
      },
    },
  });

  // ── A worked partner override, so the pattern is visible in the demo ──────
  await prisma.scoreOverride.create({
    data: {
      institutionId: institutions.get("Colegio Mirasierra Bilingüe")!,
      score: 42,
      rationale:
        "The model reads the school's quality and property correctly but overstates transaction likelihood. Cristina took over as head last year and the family has told us directly that they are not selling. Marked down until that changes.",
      userId: ctx.fouad,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: ctx.fouad,
      action: "OVERRIDE",
      entityType: "EducationInstitution",
      entityId: institutions.get("Colegio Mirasierra Bilingüe")!,
      field: "opportunityScore",
      previousValue: "computed",
      newValue: "42",
      context: "Partner override with rationale",
    },
  });
}
