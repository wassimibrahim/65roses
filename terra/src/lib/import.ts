/**
 * CSV import: parsing, column inference, validation and duplicate detection.
 *
 * Pure functions with no database or framework dependency, so the rules that
 * decide whether a row is importable can be tested directly.
 */

import { z } from "zod";

export type ImportKind = "institutions" | "contacts" | "investors" | "transactions";

export interface ColumnSpec {
  key: string;
  label: string;
  required: boolean;
  /** Header fragments that map to this column, lowercased. */
  aliases: string[];
  hint?: string;
}

export const COLUMN_SPECS: Record<ImportKind, ColumnSpec[]> = {
  institutions: [
    { key: "name", label: "Institution name", required: true, aliases: ["name", "school", "institution", "colegio", "centro"] },
    { key: "country", label: "Country", required: true, aliases: ["country", "pais", "país"] },
    { key: "city", label: "City", required: false, aliases: ["city", "ciudad", "town"] },
    { key: "region", label: "Region", required: false, aliases: ["region", "región", "province", "comunidad"] },
    { key: "type", label: "Segment", required: false, aliases: ["type", "segment", "category", "tipo"], hint: "K12, INTERNATIONAL_SCHOOL, VOCATIONAL…" },
    { key: "students", label: "Students", required: false, aliases: ["students", "pupils", "enrolment", "enrollment", "alumnos"] },
    { key: "capacity", label: "Capacity", required: false, aliases: ["capacity", "places", "capacidad"] },
    { key: "tuitionLow", label: "Tuition low", required: false, aliases: ["tuition low", "fee low", "min fee", "tuition from"] },
    { key: "tuitionHigh", label: "Tuition high", required: false, aliases: ["tuition high", "fee high", "max fee", "tuition to"] },
    { key: "ownershipType", label: "Ownership", required: false, aliases: ["ownership", "owner type", "propiedad"], hint: "FOUNDER, FAMILY, PE_BACKED…" },
    { key: "familyName", label: "Family", required: false, aliases: ["family", "familia", "owner family"] },
    { key: "tenure", label: "Campus tenure", required: false, aliases: ["tenure", "property", "freehold", "owned"], hint: "OWNED, LEASED, MIXED" },
    { key: "website", label: "Website", required: false, aliases: ["website", "url", "web"] },
  ],
  contacts: [
    { key: "firstName", label: "First name", required: true, aliases: ["first name", "firstname", "given name", "nombre"] },
    { key: "lastName", label: "Last name", required: true, aliases: ["last name", "lastname", "surname", "apellido"] },
    { key: "title", label: "Title", required: false, aliases: ["title", "role", "position", "cargo"] },
    { key: "organisation", label: "Organisation", required: false, aliases: ["organisation", "organization", "company", "firm", "empresa"] },
    { key: "email", label: "Email", required: false, aliases: ["email", "e-mail", "correo"] },
    { key: "phone", label: "Phone", required: false, aliases: ["phone", "telephone", "mobile", "telefono", "teléfono"] },
    { key: "linkedin", label: "LinkedIn", required: false, aliases: ["linkedin", "linked in"] },
    { key: "location", label: "Location", required: false, aliases: ["location", "city", "based", "ubicacion"] },
  ],
  investors: [
    { key: "name", label: "Organisation name", required: true, aliases: ["name", "organisation", "organization", "firm", "fund"] },
    { key: "type", label: "Type", required: false, aliases: ["type", "category"], hint: "PRIVATE_EQUITY, EDUCATION_OPERATOR…" },
    { key: "hq", label: "Headquarters", required: false, aliases: ["hq", "headquarters", "head office", "sede"] },
    { key: "country", label: "Country", required: false, aliases: ["country", "pais"] },
    { key: "aum", label: "AUM", required: false, aliases: ["aum", "assets", "capital", "fund size"] },
    { key: "countriesActive", label: "Countries active", required: false, aliases: ["countries", "geography", "markets"], hint: "Semicolon-separated" },
    { key: "website", label: "Website", required: false, aliases: ["website", "url", "web"] },
  ],
  transactions: [
    { key: "target", label: "Target", required: true, aliases: ["target", "company", "asset", "school"] },
    { key: "buyer", label: "Buyer", required: true, aliases: ["buyer", "acquirer", "investor", "comprador"] },
    { key: "country", label: "Country", required: true, aliases: ["country", "pais"] },
    { key: "date", label: "Date", required: true, aliases: ["date", "announced", "completion", "fecha"] },
    { key: "segment", label: "Segment", required: false, aliases: ["segment", "sector", "type"] },
    { key: "ev", label: "Enterprise value", required: false, aliases: ["ev", "enterprise value", "deal value", "price"] },
    { key: "revenue", label: "Revenue", required: false, aliases: ["revenue", "sales", "turnover", "ingresos"] },
    { key: "ebitda", label: "EBITDA", required: false, aliases: ["ebitda"] },
    { key: "realEstateIncluded", label: "Real estate included", required: false, aliases: ["real estate", "property included", "freehold"] },
  ],
};

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** RFC 4180 parsing, tolerant of quoted fields, embedded commas and CRLF. */
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // Skip blank lines rather than importing an empty record.
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows };
}

/** Best-guess mapping from CSV headers onto Terra's fields. */
export function inferMapping(headers: string[], kind: ImportKind): Record<string, number | null> {
  const specs = COLUMN_SPECS[kind];
  const mapping: Record<string, number | null> = {};
  const used = new Set<number>();

  for (const spec of specs) {
    let matched: number | null = null;
    // Exact header match first, then a contains match, so "Student count"
    // does not steal the column "Students" should own.
    headers.forEach((header, index) => {
      if (matched !== null || used.has(index)) return;
      const h = header.trim().toLowerCase();
      if (spec.aliases.includes(h)) matched = index;
    });
    if (matched === null) {
      headers.forEach((header, index) => {
        if (matched !== null || used.has(index)) return;
        const h = header.trim().toLowerCase();
        if (spec.aliases.some((a) => h.includes(a))) matched = index;
      });
    }
    if (matched !== null) used.add(matched);
    mapping[spec.key] = matched;
  }
  return mapping;
}

export interface RowIssue {
  row: number;
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface ValidatedRow {
  index: number;
  values: Record<string, string>;
  issues: RowIssue[];
  duplicateOf: string | null;
  importable: boolean;
}

export interface ValidationResult {
  rows: ValidatedRow[];
  errors: number;
  warnings: number;
  duplicates: number;
  importable: number;
}

function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

const NUMERIC_FIELDS = new Set([
  "students", "capacity", "tuitionLow", "tuitionHigh", "aum", "ev", "revenue", "ebitda",
]);

/** Normalises a name for duplicate comparison: accents, case and legal suffixes. */
export function normaliseName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?l\.?|s\.?a\.?|ltd|limited|inc|llc|gmbh|bv|plc)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function validateRows(
  parsed: ParsedCsv,
  mapping: Record<string, number | null>,
  kind: ImportKind,
  existingNames: string[] = [],
): ValidationResult {
  const specs = COLUMN_SPECS[kind];
  const existing = new Map(existingNames.map((n) => [normaliseName(n), n]));
  const seenInFile = new Map<string, number>();

  const rows = parsed.rows.map((cells, index) => {
    const values: Record<string, string> = {};
    const issues: RowIssue[] = [];

    for (const spec of specs) {
      const column = mapping[spec.key];
      const raw = column === null || column === undefined ? "" : (cells[column] ?? "").trim();
      values[spec.key] = raw;

      if (spec.required && !raw) {
        issues.push({
          row: index,
          field: spec.key,
          message: `${spec.label} is required.`,
          severity: "ERROR",
        });
      }
      if (raw && NUMERIC_FIELDS.has(spec.key) && toNumber(raw) === null) {
        issues.push({
          row: index,
          field: spec.key,
          message: `${spec.label} is not a number.`,
          severity: "ERROR",
        });
      }
      if (spec.key === "email" && raw && !z.string().email().safeParse(raw).success) {
        issues.push({
          row: index,
          field: spec.key,
          message: "Email is not valid.",
          severity: "WARNING",
        });
      }
      if (spec.key === "date" && raw && Number.isNaN(new Date(raw).getTime())) {
        issues.push({
          row: index,
          field: spec.key,
          message: "Date could not be read.",
          severity: "ERROR",
        });
      }
    }

    // Duplicate detection on the row's identifying name.
    const identity =
      kind === "contacts"
        ? `${values.firstName ?? ""} ${values.lastName ?? ""}`
        : kind === "transactions"
          ? `${values.buyer ?? ""} ${values.target ?? ""}`
          : (values.name ?? "");
    const key = normaliseName(identity);

    let duplicateOf: string | null = null;
    if (key) {
      if (existing.has(key)) {
        duplicateOf = existing.get(key)!;
        issues.push({
          row: index,
          field: "name",
          message: `Already in the database as "${duplicateOf}".`,
          severity: "WARNING",
        });
      } else if (seenInFile.has(key)) {
        duplicateOf = identity;
        issues.push({
          row: index,
          field: "name",
          message: `Duplicated earlier in this file (row ${seenInFile.get(key)! + 1}).`,
          severity: "WARNING",
        });
      } else {
        seenInFile.set(key, index);
      }
    }

    return {
      index,
      values,
      issues,
      duplicateOf,
      importable: issues.every((i) => i.severity !== "ERROR") && duplicateOf === null,
    };
  });

  return {
    rows,
    errors: rows.reduce((a, r) => a + r.issues.filter((i) => i.severity === "ERROR").length, 0),
    warnings: rows.reduce((a, r) => a + r.issues.filter((i) => i.severity === "WARNING").length, 0),
    duplicates: rows.filter((r) => r.duplicateOf !== null).length,
    importable: rows.filter((r) => r.importable).length,
  };
}
