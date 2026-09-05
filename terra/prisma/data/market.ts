/**
 * Precedent transactions and market intelligence.
 *
 * Illustrative demo content constructed to exercise the comparables and
 * intelligence surfaces. Not a record of actual transactions.
 */

import type { InstitutionType, IntelligenceCategory, SignalType, SignalStrength, Confidence } from "@prisma/client";

export interface ComparableSeed {
  target: string;
  buyer: string;
  country: string;
  monthsAgo: number;
  segment: InstitutionType;
  ev: number;
  revenue: number;
  ebitda: number;
  realEstateIncluded: boolean;
  notes?: string;
}

export const COMPARABLES: ComparableSeed[] = [
  { target: "Colegio Aljarafe", buyer: "Globeducate", country: "Spain", monthsAgo: 7, segment: "BILINGUAL_SCHOOL", ev: 31_000_000, revenue: 13_400_000, ebitda: 2_950_000, realEstateIncluded: true, notes: "Freehold included; single Seville campus." },
  { target: "St. George's Marbella", buyer: "Inspired Education Group", country: "Spain", monthsAgo: 13, segment: "INTERNATIONAL_SCHOOL", ev: 68_000_000, revenue: 21_000_000, ebitda: 5_600_000, realEstateIncluded: true, notes: "Premium tuition positioning." },
  { target: "Escola Lusa do Estoril", buyer: "Lusitania Educação", country: "Portugal", monthsAgo: 4, segment: "K12", ev: 18_500_000, revenue: 9_100_000, ebitda: 1_780_000, realEstateIncluded: false, notes: "OpCo only; landlord retained the campus." },
  { target: "Colegio Norte Bilbao", buyer: "Cognita", country: "Spain", monthsAgo: 22, segment: "K12", ev: 42_000_000, revenue: 17_600_000, ebitda: 4_100_000, realEstateIncluded: true },
  { target: "Istituto Verdi Milano", buyer: "International Schools Partnership", country: "Italy", monthsAgo: 16, segment: "INTERNATIONAL_SCHOOL", ev: 54_000_000, revenue: 19_800_000, ebitda: 4_700_000, realEstateIncluded: false },
  { target: "Colegio Aravaca", buyer: "Vega Educación", country: "Spain", monthsAgo: 10, segment: "BILINGUAL_SCHOOL", ev: 22_000_000, revenue: 10_200_000, ebitda: 2_200_000, realEstateIncluded: false, notes: "Founder retained 20% and a three-year earn-out." },
  { target: "Campus portfolio (4 assets)", buyer: "Iberian Social Infrastructure", country: "Spain", monthsAgo: 6, segment: "K12", ev: 78_000_000, revenue: 4_800_000, ebitda: 4_600_000, realEstateIncluded: true, notes: "PropCo portfolio; 5.9% net initial yield on a 20-year indexed lease." },
  { target: "Académie Bordeaux Bilingue", buyer: "Globeducate", country: "France", monthsAgo: 19, segment: "BILINGUAL_SCHOOL", ev: 26_500_000, revenue: 12_100_000, ebitda: 2_450_000, realEstateIncluded: false },
  { target: "Formación Profesional Levante", buyer: "Aurelia Capital", country: "Spain", monthsAgo: 9, segment: "VOCATIONAL", ev: 48_000_000, revenue: 26_000_000, ebitda: 5_300_000, realEstateIncluded: false, notes: "Capital-light vocational platform." },
  { target: "The Winchester School Group", buyer: "Gulf Education Holdings", country: "United Arab Emirates", monthsAgo: 28, segment: "BRITISH_SCHOOL", ev: 112_000_000, revenue: 41_000_000, ebitda: 11_800_000, realEstateIncluded: false },
  { target: "Colegio Santa Elena", buyer: "Iberian Schools Group", country: "Spain", monthsAgo: 31, segment: "K12", ev: 9_400_000, revenue: 5_600_000, ebitda: 950_000, realEstateIncluded: true, notes: "Small single-site acquisition." },
  { target: "Zurich Lakeside College", buyer: "Helvetia Bildung Holding", country: "Switzerland", monthsAgo: 15, segment: "INTERNATIONAL_SCHOOL", ev: 96_000_000, revenue: 28_500_000, ebitda: 7_900_000, realEstateIncluded: true, notes: "Premium boarding component." },
  { target: "Nursery group (9 sites)", buyer: "Meridian Growth Partners", country: "Spain", monthsAgo: 3, segment: "EARLY_YEARS", ev: 15_800_000, revenue: 8_900_000, ebitda: 1_620_000, realEstateIncluded: false, notes: "First education investment for the fund." },
  { target: "Colégio Braga Internacional", buyer: "Northgate Education Partners", country: "Portugal", monthsAgo: 25, segment: "INTERNATIONAL_SCHOOL", ev: 34_000_000, revenue: 14_200_000, ebitda: 3_250_000, realEstateIncluded: false },
  { target: "Instituto Superior Andaluz", buyer: "Alpina Capital", country: "Spain", monthsAgo: 20, segment: "HIGHER_EDUCATION", ev: 61_000_000, revenue: 29_000_000, ebitda: 6_400_000, realEstateIncluded: true },
];

export interface SignalSeed {
  institution: string;
  type: SignalType;
  monthsAgo: number;
  headline: string;
  detail?: string;
  interpretation?: string;
  implication?: string;
  strength: SignalStrength;
  confidence: Confidence;
  source: string;
}

export const SIGNALS: SignalSeed[] = [
  { institution: "Colegio Monteverde", type: "LEADERSHIP_CHANGE", monthsAgo: 4, headline: "Non-family head of school confirmed in expanded role", detail: "Rosa Domínguez's remit was widened to include operations and finance.", interpretation: "Professionalisation of management often precedes an institutional capital event.", implication: "The founder may be preparing the business to run without him.", strength: "STRONG", confidence: "HIGH_CONFIDENCE", source: "Local press" },
  { institution: "Colegio Monteverde", type: "ENROLLMENT_GROWTH", monthsAgo: 8, headline: "Waiting list reported across primary years", detail: "Admissions materials reference a waiting list for three consecutive intakes.", interpretation: "Demand exceeds capacity at the current campus footprint.", implication: "Growth from here requires capital, not marketing.", strength: "MODERATE", confidence: "ESTIMATED", source: "School website" },
  { institution: "Colegio Monteverde", type: "TUITION_CHANGE", monthsAgo: 11, headline: "Published fees increased 6.2% year on year", interpretation: "Pricing power consistent with a strong local position.", strength: "MODERATE", confidence: "VERIFIED", source: "Published fee schedule" },
  { institution: "Colegio Villanueva", type: "NEW_CEO", monthsAgo: 8, headline: "First non-family managing director appointed", detail: "Gonzalo Herrera joined from a listed services group.", interpretation: "The family appears to be separating ownership from management.", implication: "A transaction discussion is plausible within 12–24 months.", strength: "STRONG", confidence: "VERIFIED", source: "Company announcement" },
  { institution: "Colegio Villanueva", type: "PROPERTY_ACQUISITION", monthsAgo: 3, headline: "Adjacent plot acquired next to the second campus", interpretation: "Expansion intent, and a funding need to go with it.", strength: "MODERATE", confidence: "HIGH_CONFIDENCE", source: "Land registry filing" },
  { institution: "Highfield International Bilbao", type: "REFINANCING", monthsAgo: 5, headline: "Acquisition facility refinanced and extended", interpretation: "Sponsors typically refinance either to hold longer or to prepare an exit.", implication: "Ownership is approaching a decision point.", strength: "MODERATE", confidence: "ESTIMATED", source: "Filed accounts" },
  { institution: "Colegio Puerta del Mar", type: "CAMPUS_EXPANSION", monthsAgo: 6, headline: "Planning application filed for a sixth-form building", interpretation: "Capital expenditure plans at a founder-owned school often precede a funding conversation.", strength: "STRONG", confidence: "VERIFIED", source: "Municipal planning register" },
  { institution: "Colegio Puerta del Mar", type: "MEDIA_MENTION", monthsAgo: 2, headline: "Founder interviewed on the school's next twenty years", detail: "Interview references 'finding the right long-term partner'.", interpretation: "Language of this kind is often the first public signal of openness to capital.", implication: "Terra hypothesis only — no approach has been made.", strength: "MODERATE", confidence: "UNVERIFIED", source: "Regional newspaper" },
  { institution: "Colegio Los Almendros", type: "JOB_POSTING_GROWTH", monthsAgo: 3, headline: "Twelve teaching posts advertised for September", interpretation: "Consistent with continued enrolment growth.", strength: "WEAK", confidence: "ESTIMATED", source: "Recruitment portal" },
  { institution: "Colegio Los Almendros", type: "PROPERTY_ACQUISITION", monthsAgo: 14, headline: "Family acquired the adjacent plot personally", interpretation: "The property and the school may be separable — a PropCo structure is available.", strength: "STRONG", confidence: "HIGH_CONFIDENCE", source: "Land registry filing" },
  { institution: "Centro de Estudios Aranjuez", type: "ENROLLMENT_DECLINE", monthsAgo: 2, headline: "Third consecutive year of falling enrolment", detail: "Estimated 540 students against a capacity of 720.", interpretation: "Deteriorating position; value is eroding while the founder waits.", implication: "If a transaction is intended, timing matters more than price.", strength: "STRONG", confidence: "ESTIMATED", source: "Terra research" },
  { institution: "Colegio Cervantes Toledo", type: "FOUNDER_RETIREMENT", monthsAgo: 5, headline: "Founder stepped back from the executive committee", interpretation: "Classic pre-succession signal at a school with no identified successor.", strength: "STRONG", confidence: "HIGH_CONFIDENCE", source: "School newsletter" },
  { institution: "Colegio Mirasierra Bilingüe", type: "NEW_FAMILY_MEMBER_IN_MANAGEMENT", monthsAgo: 16, headline: "Founder's daughter appointed head of school", interpretation: "Succession appears internally resolved; urgency is lower.", implication: "Better positioned as a long-term relationship than a near-term mandate.", strength: "STRONG", confidence: "VERIFIED", source: "School announcement" },
  { institution: "Escola Nova Lisboa", type: "CAMPUS_EXPANSION", monthsAgo: 4, headline: "Second Lisbon site under negotiation", interpretation: "Growth ambition beyond the current leased footprint.", implication: "A growth-capital conversation is more relevant than a sale.", strength: "STRONG", confidence: "ESTIMATED", source: "Founder interview" },
  { institution: "Zürich Academy of Sciences", type: "LEADERSHIP_CHANGE", monthsAgo: 7, headline: "External chair of the supervisory board appointed", interpretation: "Structured succession process appears to be underway.", strength: "STRONG", confidence: "HIGH_CONFIDENCE", source: "Company register" },
  { institution: "Thames Valley Preparatory", type: "REGULATORY_CHANGE", monthsAgo: 18, headline: "VAT applied to independent school fees", detail: "Sector-wide change affecting UK independent schools.", interpretation: "Margin compression across the UK independent sector.", implication: "Sub-scale UK preps become consolidation candidates.", strength: "STRONG", confidence: "VERIFIED", source: "HM Treasury" },
  { institution: "Colegio Bahía de Cádiz", type: "ENROLLMENT_DECLINE", monthsAgo: 6, headline: "Enrolment down an estimated 8% year on year", strength: "MODERATE", confidence: "ESTIMATED", interpretation: "Structural decline rather than a single weak intake.", source: "Terra research" },
  { institution: "Instituto Tecnológico Levante", type: "STRATEGIC_PARTNERSHIP", monthsAgo: 3, headline: "Framework agreement signed with three regional employers", interpretation: "Employer-backed placement pipelines materially de-risk vocational enrolment.", strength: "MODERATE", confidence: "HIGH_CONFIDENCE", source: "Company announcement" },
  { institution: "Instituto Politécnico Ebro", type: "ENROLLMENT_GROWTH", monthsAgo: 5, headline: "Intake up an estimated 14%", interpretation: "Spanish FP reform continues to drive vocational demand.", strength: "MODERATE", confidence: "ESTIMATED", source: "Terra research" },
  { institution: "British College of Alcobendas", type: "ACCREDITATION", monthsAgo: 9, headline: "COBIS accreditation renewed with commendation", strength: "WEAK", confidence: "VERIFIED", interpretation: "Quality signal; supports premium positioning.", source: "COBIS register" },
  { institution: "Institut Sant Jordi", type: "NEW_CEO", monthsAgo: 20, headline: "Professional general manager appointed", interpretation: "Family stepping back from operations.", strength: "MODERATE", confidence: "VERIFIED", source: "Company register" },
  { institution: "American Academy of Valencia", type: "CAMPUS_EXPANSION", monthsAgo: 7, headline: "Additional leased building taken adjacent to the campus", interpretation: "Capacity constraint being solved with leases rather than capital.", strength: "MODERATE", confidence: "HIGH_CONFIDENCE", source: "Local press" },
  { institution: "Colegio Costa Brava", type: "PROPERTY_SALE", monthsAgo: 11, headline: "Undeveloped parcel within the site boundary marketed", interpretation: "Land value may be realisable independently of the school.", strength: "MODERATE", confidence: "ESTIMATED", source: "Property listing" },
  { institution: "Colegio Vigo Atlántico", type: "MEDIA_MENTION", monthsAgo: 4, headline: "Founder quoted on succession in a regional business profile", interpretation: "Public acknowledgement of an unresolved succession question.", implication: "Terra hypothesis: openness to a first conversation.", strength: "MODERATE", confidence: "UNVERIFIED", source: "Regional business review" },
  { institution: "Madrid Global Business School", type: "CAPITAL_RAISE", monthsAgo: 13, headline: "Minority investment reported in the executive-education arm", interpretation: "Ownership has already accepted external capital once.", implication: "Prior capital experience materially raises transaction likelihood.", strength: "MODERATE", confidence: "ESTIMATED", source: "Sector press" },
];

export interface IntelligenceSeed {
  category: IntelligenceCategory;
  title: string;
  summary: string;
  body?: string;
  monthsAgo: number;
  country?: string;
  source: string;
  /** Institution names this item connects to. */
  institutions?: string[];
  /** Organisation names this item connects to. */
  organisations?: string[];
}

export const INTELLIGENCE: IntelligenceSeed[] = [
  {
    category: "TRANSACTIONS",
    title: "Globeducate acquires Colegio Aljarafe in Seville",
    summary: "Bilingual K–12 school with an owned campus, acquired at an estimated 10.5× EBITDA including real estate.",
    body: "The transaction extends the buyer's Andalusian footprint and is the third Spanish acquisition in eighteen months by a European operator. The freehold was included rather than separated, which continues to be the exception rather than the rule in the segment.",
    monthsAgo: 7,
    country: "Spain",
    source: "Sector press",
    organisations: ["Globeducate"],
  },
  {
    category: "REAL_ESTATE",
    title: "Four-campus PropCo portfolio trades at a 5.9% net initial yield",
    summary: "Institutional owner acquires four Spanish school freeholds on 20-year indexed leases.",
    body: "The pricing establishes a usable reference point for Spanish education sale-and-leaseback structures where the operating covenant is strong. Terra reads this as evidence that a PropCo separation is now executable in Spain at institutional pricing.",
    monthsAgo: 6,
    country: "Spain",
    source: "Property press",
    organisations: ["Iberian Social Infrastructure"],
  },
  {
    category: "OPERATORS",
    title: "Vega Educación signals four to six further Spanish additions",
    summary: "Founder-led operator confirms an ongoing acquisition programme in the bilingual segment.",
    monthsAgo: 2,
    country: "Spain",
    source: "Founder interview",
    organisations: ["Vega Educación"],
  },
  {
    category: "INVESTORS",
    title: "Meridian Growth Partners seeks a first education platform",
    summary: "Iberian growth fund confirms education as a priority sector for its current fund.",
    body: "The fund has told Terra directly that it will consider a 51% structure where the founder remains as chairman — an unusually flexible posture for a Spanish sponsor.",
    monthsAgo: 5,
    country: "Spain",
    source: "Direct conversation",
    organisations: ["Meridian Growth Partners"],
  },
  {
    category: "REGULATION",
    title: "VAT on UK independent school fees continues to compress margins",
    summary: "Sub-scale UK preparatory schools face structural margin pressure.",
    body: "The change has moved a cohort of small independent schools from comfortable to marginal. Consolidation is the likely medium-term outcome.",
    monthsAgo: 18,
    country: "United Kingdom",
    source: "HM Treasury",
    institutions: ["Thames Valley Preparatory"],
  },
  {
    category: "MARKET_DATA",
    title: "Spanish private K–12 tuition rose an estimated 5.4% in the last academic year",
    summary: "Fee growth continues to run ahead of general inflation in the private segment.",
    monthsAgo: 4,
    country: "Spain",
    source: "Terra analysis",
  },
  {
    category: "EDUCATION_TRENDS",
    title: "International in-migration continues to drive Iberian enrolment",
    summary: "Lisbon, Madrid and the Costa del Sol show the strongest demand growth for English-medium education.",
    monthsAgo: 3,
    country: "Spain",
    source: "Terra analysis",
    institutions: ["Escola Nova Lisboa", "Colegio Puerta del Mar", "Colegio Los Almendros"],
  },
  {
    category: "TRANSACTIONS",
    title: "Founder retains 20% and a three-year earn-out in Colegio Aravaca sale",
    summary: "Structure indicates continued buyer appetite for founder continuity in Spanish deals.",
    monthsAgo: 10,
    country: "Spain",
    source: "Sector press",
    organisations: ["Vega Educación"],
  },
  {
    category: "OPERATORS",
    title: "Iberian Schools Group founder approaching a decision point",
    summary: "Four-school regional operator whose founder is fifty-eight with no succession plan in place.",
    body: "Terra hypothesis: this is a seller as much as a buyer over a three-year horizon.",
    monthsAgo: 1,
    country: "Spain",
    source: "Terra research",
    organisations: ["Iberian Schools Group"],
  },
  {
    category: "INVESTORS",
    title: "Northgate approaching the end of its Highfield hold period",
    summary: "Fund III entered its fifth year of ownership of the Bilbao asset.",
    monthsAgo: 5,
    country: "Spain",
    source: "Filed accounts",
    organisations: ["Northgate Education Partners"],
    institutions: ["Highfield International Bilbao"],
  },
  {
    category: "REAL_ESTATE",
    title: "Education freeholds increasingly treated as social infrastructure",
    summary: "Infrastructure capital is competing with real-estate capital for school campuses.",
    body: "The practical consequence for founders is a wider buyer universe for the property than for the operating business.",
    monthsAgo: 8,
    country: "Spain",
    source: "Terra analysis",
    organisations: ["Baltrum Infrastructure", "Iberian Social Infrastructure"],
  },
  {
    category: "MARKET_DATA",
    title: "Spanish K–12 transaction multiples cluster between 9× and 12× EBITDA",
    summary: "Interquartile range from Terra's own comparable set, real estate included where disclosed.",
    monthsAgo: 2,
    country: "Spain",
    source: "Terra comparable set",
  },
];
