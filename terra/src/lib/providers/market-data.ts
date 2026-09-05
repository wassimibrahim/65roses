/**
 * External market-data interface — PitchBook, Capital IQ, Registro Mercantil,
 * property databases. Mock implementations keep the MVP running with no paid
 * API, and a real provider slots in behind the same interface.
 */

export interface CompanyRecord {
  name: string;
  registrationNumber: string | null;
  country: string;
  incorporatedAt: Date | null;
  officers: { name: string; role: string }[];
  filings: { date: Date; type: string; url: string | null }[];
}

export interface MarketDataProvider {
  readonly name: string;
  readonly configured: boolean;
  lookupCompany(name: string, country: string): Promise<CompanyRecord | null>;
}

class UnconfiguredMarketData implements MarketDataProvider {
  readonly name = "none";
  readonly configured = false;

  async lookupCompany(): Promise<CompanyRecord | null> {
    // No paid API is required for the MVP; research is entered by an analyst.
    return null;
  }
}

export function marketDataProvider(): MarketDataProvider {
  return new UnconfiguredMarketData();
}
