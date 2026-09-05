/** Minimal, dependency-free CSV writer. Excel-safe quoting, UTF-8 BOM. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const keys = columns ?? Object.keys(rows[0]!);
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const str = String(value);
    // A leading =, +, - or @ is executed by spreadsheet software. Neutralise it.
    const guarded = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
  };
  const header = keys.map(escape).join(",");
  const body = rows.map((row) => keys.map((k) => escape(row[k])).join(",")).join("\r\n");
  return `﻿${header}\r\n${body}`;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
