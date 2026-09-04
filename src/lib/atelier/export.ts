// The CSV. Two shapes: the ordinary one, and the one an owner ticks a box for.
//
// Addresses and phone numbers leave the building only in the second, and only
// an OWNER can ask for it. Everything about this file is designed to be
// boring except that rule, which is the whole point of the file.

export interface ExportRow {
  memberNumber: string;
  firstName: string;
  lastName: string;
  instagramHandle: string;
  status: string;
  city: string;
  communityStatus: string;
  eventsInvited: number;
  eventsAttended: number;
  eventsNoShow: number;
  lastAttendanceAt: Date | null;
  // present only when an owner asked for them
  phone?: string;
  addressLine?: string;
  area?: string;
}

const SAFE_COLUMNS = [
  "memberNumber",
  "firstName",
  "lastName",
  "instagramHandle",
  "status",
  "city",
  "communityStatus",
  "eventsInvited",
  "eventsAttended",
  "eventsNoShow",
  "lastAttendanceAt",
] as const;

const ADDRESS_COLUMNS = ["phone", "area", "addressLine"] as const;

/**
 * A spreadsheet treats a leading =, +, - or @ as a formula, so a name or a
 * note can become one. Every field is quoted and any leading formula
 * character is neutralised before it reaches a cell.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  const defused = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${defused.replace(/"/g, '""')}"`;
}

export function toCsv(rows: ExportRow[], withAddresses: boolean): string {
  const columns: string[] = withAddresses
    ? [...SAFE_COLUMNS, ...ADDRESS_COLUMNS]
    : [...SAFE_COLUMNS];

  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => cell(row[column as keyof ExportRow])).join(","));
  }
  return lines.join("\r\n");
}

export const EXPORT_COLUMNS = { safe: SAFE_COLUMNS, address: ADDRESS_COLUMNS };
