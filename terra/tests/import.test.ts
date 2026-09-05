import { describe, it, expect } from "vitest";
import {
  parseCsv,
  inferMapping,
  validateRows,
  normaliseName,
  COLUMN_SPECS,
} from "@/lib/import";

describe("CSV parsing", () => {
  it("parses a simple file", () => {
    const parsed = parseCsv("Name,City\nColegio A,Madrid\nColegio B,Barcelona\n");
    expect(parsed.headers).toEqual(["Name", "City"]);
    expect(parsed.rows).toEqual([
      ["Colegio A", "Madrid"],
      ["Colegio B", "Barcelona"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const parsed = parseCsv('Name,Note\n"Colegio A, S.L.","Founded 1974, Madrid"\n');
    expect(parsed.rows[0]).toEqual(["Colegio A, S.L.", "Founded 1974, Madrid"]);
  });

  it("handles escaped quotes", () => {
    const parsed = parseCsv('Name\n"The ""Old"" School"\n');
    expect(parsed.rows[0]![0]).toBe('The "Old" School');
  });

  it("handles CRLF line endings and a byte-order mark", () => {
    const parsed = parseCsv('﻿Name,City\r\nColegio A,Madrid\r\n');
    expect(parsed.headers).toEqual(["Name", "City"]);
    expect(parsed.rows).toHaveLength(1);
  });

  it("skips blank lines rather than importing empty records", () => {
    const parsed = parseCsv("Name,City\nColegio A,Madrid\n\n\nColegio B,Girona\n");
    expect(parsed.rows).toHaveLength(2);
  });
});

describe("column inference", () => {
  it("maps recognisable headers", () => {
    const mapping = inferMapping(["School", "Country", "City", "Pupils"], "institutions");
    expect(mapping.name).toBe(0);
    expect(mapping.country).toBe(1);
    expect(mapping.city).toBe(2);
    expect(mapping.students).toBe(3);
  });

  it("prefers an exact header match over a partial one", () => {
    // "Students" must claim the exact column, not the one merely containing it.
    const mapping = inferMapping(["Total students enrolled", "Students"], "institutions");
    expect(mapping.students).toBe(1);
  });

  it("never maps two fields to the same column", () => {
    const mapping = inferMapping(["City", "Country"], "institutions");
    const used = Object.values(mapping).filter((v): v is number => v !== null);
    expect(new Set(used).size).toBe(used.length);
  });

  it("leaves unmatched fields null", () => {
    const mapping = inferMapping(["Name"], "institutions");
    expect(mapping.name).toBe(0);
    expect(mapping.tuitionLow).toBeNull();
  });

  it("maps Spanish headers", () => {
    const mapping = inferMapping(["Nombre", "Apellido", "Cargo"], "contacts");
    expect(mapping.firstName).toBe(0);
    expect(mapping.lastName).toBe(1);
    expect(mapping.title).toBe(2);
  });
});

describe("validation", () => {
  const parsed = parseCsv(
    [
      "Name,Country,City,Students",
      "Colegio Alpha,Spain,Madrid,800",
      ",Spain,Madrid,400",
      "Colegio Beta,Spain,Girona,not a number",
      "Colegio Alpha,Spain,Madrid,800",
      "Colegio Gamma,Spain,Vigo,600",
    ].join("\n"),
  );
  const mapping = inferMapping(parsed.headers, "institutions");

  it("flags a missing required field as an error", () => {
    const result = validateRows(parsed, mapping, "institutions");
    expect(result.rows[1]!.issues[0]!.severity).toBe("ERROR");
    expect(result.rows[1]!.importable).toBe(false);
  });

  it("flags a non-numeric number as an error", () => {
    const result = validateRows(parsed, mapping, "institutions");
    const issue = result.rows[2]!.issues.find((i) => i.field === "students");
    expect(issue?.severity).toBe("ERROR");
  });

  it("detects a duplicate within the file", () => {
    const result = validateRows(parsed, mapping, "institutions");
    expect(result.rows[3]!.duplicateOf).not.toBeNull();
    expect(result.rows[3]!.importable).toBe(false);
  });

  it("detects a duplicate against existing records", () => {
    const result = validateRows(parsed, mapping, "institutions", ["Colegio Gamma"]);
    expect(result.rows[4]!.duplicateOf).toBe("Colegio Gamma");
  });

  it("counts what will actually import", () => {
    // Alpha and Gamma import; the nameless row and the bad number error, and
    // the repeated Alpha is held back as a duplicate.
    const result = validateRows(parsed, mapping, "institutions");
    expect(result.importable).toBe(2);
    expect(result.errors).toBeGreaterThan(0);
    expect(result.duplicates).toBe(1);
  });

  it("treats a bad email as a warning, not a blocker", () => {
    const contacts = parseCsv("First name,Last name,Email\nAna,Ruiz,not-an-email\n");
    const result = validateRows(contacts, inferMapping(contacts.headers, "contacts"), "contacts");
    expect(result.rows[0]!.issues[0]!.severity).toBe("WARNING");
    expect(result.rows[0]!.importable).toBe(true);
  });

  it("rejects an unreadable date on a transaction", () => {
    const rows = parseCsv("Target,Buyer,Country,Date\nA,B,Spain,not a date\n");
    const result = validateRows(rows, inferMapping(rows.headers, "transactions"), "transactions");
    expect(result.rows[0]!.importable).toBe(false);
  });
});

describe("name normalisation", () => {
  it("ignores accents, case and legal suffixes when comparing", () => {
    expect(normaliseName("Colegio Monteverde S.L.")).toBe(normaliseName("colegio monteverde"));
    expect(normaliseName("Institut Sant Jordi")).toBe(normaliseName("INSTITUT SANT JORDI"));
    expect(normaliseName("Málaga Academy")).toBe(normaliseName("Malaga Academy"));
  });

  it("keeps genuinely different names apart", () => {
    expect(normaliseName("Colegio Alpha")).not.toBe(normaliseName("Colegio Beta"));
  });
});

describe("column specifications", () => {
  it("defines a required identity column for every import kind", () => {
    for (const specs of Object.values(COLUMN_SPECS)) {
      expect(specs.some((s) => s.required)).toBe(true);
    }
  });
});
