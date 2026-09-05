/**
 * TRANSACTION STRUCTURE LAB — the same asset, expressed eight different ways.
 *
 * The output is not advice. It is the arithmetic a founder needs in order to
 * see that "sell the school" is one of several very different decisions.
 */

import { round } from "./types";

export type StructureType =
  | "FULL_SALE"
  | "OPCO_SALE"
  | "PROPCO_SALE"
  | "SALE_LEASEBACK"
  | "MAJORITY_PARTNERSHIP"
  | "MINORITY_GROWTH"
  | "RECAPITALISATION"
  | "JV_EXPANSION";

export const STRUCTURE_LABELS: Record<StructureType, string> = {
  FULL_SALE: "100% sale",
  OPCO_SALE: "OpCo sale",
  PROPCO_SALE: "PropCo sale",
  SALE_LEASEBACK: "Sale-and-leaseback",
  MAJORITY_PARTNERSHIP: "Majority partnership",
  MINORITY_GROWTH: "Minority growth capital",
  RECAPITALISATION: "Recapitalisation",
  JV_EXPANSION: "JV / expansion partnership",
};

export const STRUCTURE_DESCRIPTIONS: Record<StructureType, string> = {
  FULL_SALE: "Buyer acquires the operating company and the property together.",
  OPCO_SALE: "Operator acquired on its own. The founder retains the campus and receives rent.",
  PROPCO_SALE: "Property sold to an institutional owner. The institution continues under a lease.",
  SALE_LEASEBACK: "Real estate sold and leased back on a long institutional lease.",
  MAJORITY_PARTNERSHIP: "Investor takes majority control; the founder retains a meaningful minority.",
  MINORITY_GROWTH: "Investor takes a minority stake; proceeds fund growth rather than the founder.",
  RECAPITALISATION: "Debt-funded liquidity for the founder while ownership is retained.",
  JV_EXPANSION: "Capital partner funds new campuses alongside the founder.",
};

export interface StructureAssumptions {
  /** Operating EBITDA before any property rent. */
  ebitdaPreRent: number;
  /** Multiple applied to the OpCo once a market rent is charged. */
  opcoMultiple: number;
  /** Market rent for the campus, used to split OpCo from PropCo. */
  marketRent: number;
  /** Net initial yield an institutional property buyer would apply. */
  propertyYield: number;
  existingNetDebt: number;
  /** Stake sold, where the structure allows a choice. */
  stakeSold?: number;
  /** New money injected for growth structures. */
  growthCapital?: number;
  /** Leverage applied in a recapitalisation, as a multiple of EBITDA. */
  recapLeverage?: number;
  /** Illustrative forward view used for the second-exit column. */
  exitYears?: number;
  exitEbitdaGrowth?: number;
  exitMultiple?: number;
  transactionCostsPct?: number;
}

export interface StructureOutcome {
  type: StructureType;
  label: string;
  description: string;
  /** Cash to the founder at close, net of costs and debt repayment. */
  founderProceeds: number;
  /** Equity the investor must write a cheque for. */
  investorEquity: number;
  enterpriseValue: number;
  equityValue: number;
  debtRepaid: number;
  propertyValue: number;
  rentImplication: number;
  ebitdaAfterRent: number;
  stakeRetained: number;
  /** Illustrative value of the retained stake at a later exit. */
  illustrativeFutureValue: number;
  secondExitProceeds: number;
  controlRetained: boolean;
  complexity: 1 | 2 | 3 | 4 | 5;
  notes: string[];
}

const DEFAULTS = {
  stakeSold: 1,
  growthCapital: 0,
  recapLeverage: 3,
  exitYears: 5,
  exitEbitdaGrowth: 0.07,
  exitMultiple: 0,
  transactionCostsPct: 0.02,
};

export function modelStructure(
  type: StructureType,
  raw: StructureAssumptions,
): StructureOutcome {
  const a = { ...DEFAULTS, ...raw };
  const costs = a.transactionCostsPct;
  const propertyValue = a.propertyYield > 0 ? a.marketRent / a.propertyYield : 0;
  const ebitdaAfterRent = a.ebitdaPreRent - a.marketRent;
  const opcoEv = Math.max(0, ebitdaAfterRent * a.opcoMultiple);
  // With the property retained inside the business, no rent is charged.
  const combinedEv = Math.max(0, a.ebitdaPreRent * a.opcoMultiple * 0.72) + propertyValue;
  const exitMultiple = a.exitMultiple || a.opcoMultiple;
  const notes: string[] = [];

  const grow = (ebitda: number) => ebitda * (1 + a.exitEbitdaGrowth) ** a.exitYears;

  let enterpriseValue = 0;
  let equityValue = 0;
  let founderProceeds = 0;
  let investorEquity = 0;
  let stakeRetained = 0;
  let rentImplication = 0;
  let debtRepaid = a.existingNetDebt;
  let controlRetained = false;
  let complexity: StructureOutcome["complexity"] = 2;
  let illustrativeFutureValue = 0;
  let secondExitProceeds = 0;

  switch (type) {
    case "FULL_SALE": {
      enterpriseValue = combinedEv;
      equityValue = enterpriseValue - a.existingNetDebt;
      founderProceeds = equityValue * (1 - costs);
      investorEquity = equityValue;
      stakeRetained = 0;
      complexity = 2;
      notes.push("Cleanest outcome and typically the highest headline number.");
      notes.push("No continuing founder role, no residual upside.");
      break;
    }
    case "OPCO_SALE": {
      enterpriseValue = opcoEv;
      equityValue = enterpriseValue - a.existingNetDebt;
      founderProceeds = equityValue * (1 - costs);
      investorEquity = equityValue;
      rentImplication = a.marketRent;
      stakeRetained = 0;
      complexity = 4;
      notes.push(`Founder retains the campus and receives ${Math.round(a.marketRent).toLocaleString()} of annual rent.`);
      notes.push("Property remains a family asset and can be sold separately later.");
      illustrativeFutureValue = propertyValue * 1.15;
      secondExitProceeds = illustrativeFutureValue;
      break;
    }
    case "PROPCO_SALE": {
      enterpriseValue = propertyValue;
      equityValue = propertyValue;
      founderProceeds = propertyValue * (1 - costs);
      investorEquity = propertyValue;
      rentImplication = a.marketRent;
      stakeRetained = 1;
      controlRetained = true;
      complexity = 3;
      notes.push("The institution keeps operating; only the freehold changes hands.");
      notes.push("Rent becomes a permanent cost line — EBITDA falls accordingly.");
      illustrativeFutureValue = grow(ebitdaAfterRent) * exitMultiple;
      secondExitProceeds = illustrativeFutureValue;
      break;
    }
    case "SALE_LEASEBACK": {
      enterpriseValue = propertyValue;
      equityValue = propertyValue;
      founderProceeds = Math.max(0, propertyValue - a.existingNetDebt) * (1 - costs);
      investorEquity = propertyValue;
      rentImplication = a.marketRent;
      stakeRetained = 1;
      controlRetained = true;
      complexity = 3;
      debtRepaid = Math.min(a.existingNetDebt, propertyValue);
      notes.push("Liquidity without giving up any of the operating business.");
      notes.push("A long institutional lease is required — typically 15–25 years, indexed.");
      illustrativeFutureValue = grow(ebitdaAfterRent) * exitMultiple;
      secondExitProceeds = illustrativeFutureValue;
      break;
    }
    case "MAJORITY_PARTNERSHIP": {
      const stake = raw.stakeSold ?? 0.7;
      enterpriseValue = combinedEv;
      equityValue = enterpriseValue - a.existingNetDebt;
      founderProceeds = equityValue * stake * (1 - costs);
      investorEquity = equityValue * stake;
      stakeRetained = 1 - stake;
      complexity = 3;
      notes.push(`Founder retains ${Math.round((1 - stake) * 100)}% and stays involved.`);
      notes.push("Second bite at exit is typically the largest single value driver.");
      illustrativeFutureValue = (grow(a.ebitdaPreRent) * exitMultiple * 0.72 + propertyValue * 1.15);
      secondExitProceeds = illustrativeFutureValue * (1 - stake);
      break;
    }
    case "MINORITY_GROWTH": {
      const stake = raw.stakeSold ?? 0.25;
      enterpriseValue = combinedEv;
      equityValue = enterpriseValue - a.existingNetDebt;
      investorEquity = equityValue * stake;
      // Proceeds go into the business, not to the founder.
      founderProceeds = 0;
      stakeRetained = 1 - stake;
      controlRetained = true;
      complexity = 3;
      notes.push("Capital funds expansion — the founder takes no liquidity.");
      notes.push("Governance rights and an exit path must be negotiated carefully.");
      illustrativeFutureValue = grow(a.ebitdaPreRent + (a.growthCapital * 0.18)) * exitMultiple * 0.72 + propertyValue * 1.15;
      secondExitProceeds = illustrativeFutureValue * (1 - stake);
      break;
    }
    case "RECAPITALISATION": {
      const newDebt = a.ebitdaPreRent * a.recapLeverage;
      enterpriseValue = combinedEv;
      equityValue = enterpriseValue - a.existingNetDebt;
      founderProceeds = Math.max(0, newDebt - a.existingNetDebt) * (1 - costs);
      investorEquity = 0;
      stakeRetained = 1;
      controlRetained = true;
      complexity = 3;
      debtRepaid = a.existingNetDebt;
      notes.push(`Liquidity of roughly ${a.recapLeverage.toFixed(1)}× EBITDA without selling equity.`);
      notes.push("Leverage risk sits with the family — sensitive to enrolment shocks.");
      illustrativeFutureValue = grow(a.ebitdaPreRent) * exitMultiple * 0.72 + propertyValue * 1.15 - newDebt;
      secondExitProceeds = illustrativeFutureValue;
      break;
    }
    case "JV_EXPANSION": {
      const stake = raw.stakeSold ?? 0.4;
      enterpriseValue = a.growthCapital || combinedEv * 0.3;
      equityValue = enterpriseValue;
      investorEquity = enterpriseValue * stake;
      founderProceeds = 0;
      stakeRetained = 1 - stake;
      controlRetained = true;
      complexity = 5;
      notes.push("Capital is ring-fenced to new campuses; the existing school is untouched.");
      notes.push("Most complex to document — the JV perimeter has to be exact.");
      illustrativeFutureValue = grow(a.ebitdaPreRent) * exitMultiple * 0.72 + propertyValue * 1.15;
      secondExitProceeds = illustrativeFutureValue * (1 - stake);
      break;
    }
  }

  return {
    type,
    label: STRUCTURE_LABELS[type],
    description: STRUCTURE_DESCRIPTIONS[type],
    founderProceeds: round(Math.max(0, founderProceeds)),
    investorEquity: round(Math.max(0, investorEquity)),
    enterpriseValue: round(enterpriseValue),
    equityValue: round(equityValue),
    debtRepaid: round(debtRepaid),
    propertyValue: round(propertyValue),
    rentImplication: round(rentImplication),
    ebitdaAfterRent: round(rentImplication > 0 ? ebitdaAfterRent : a.ebitdaPreRent),
    stakeRetained: round(stakeRetained, 3),
    illustrativeFutureValue: round(Math.max(0, illustrativeFutureValue)),
    secondExitProceeds: round(Math.max(0, secondExitProceeds)),
    controlRetained,
    complexity,
    notes,
  };
}

export const ALL_STRUCTURES: StructureType[] = [
  "FULL_SALE",
  "OPCO_SALE",
  "PROPCO_SALE",
  "SALE_LEASEBACK",
  "MAJORITY_PARTNERSHIP",
  "MINORITY_GROWTH",
  "RECAPITALISATION",
  "JV_EXPANSION",
];

export function modelAllStructures(
  assumptions: StructureAssumptions,
  types: StructureType[] = ALL_STRUCTURES,
): StructureOutcome[] {
  return types.map((t) => modelStructure(t, assumptions));
}
