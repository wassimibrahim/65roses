/** Presentation formatters. Terra shows ranges, not false precision. */

const EUR = "€";

export function money(value: number | null | undefined, opts?: { decimals?: number }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const d = opts?.decimals;
  if (abs >= 1_000_000_000) return `${EUR}${(value / 1_000_000_000).toFixed(d ?? 1)}bn`;
  if (abs >= 1_000_000) return `${EUR}${(value / 1_000_000).toFixed(d ?? (abs >= 10_000_000 ? 0 : 1))}m`;
  if (abs >= 1_000) return `${EUR}${(value / 1_000).toFixed(d ?? 0)}k`;
  return `${EUR}${value.toFixed(d ?? 0)}`;
}

export function moneyRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string {
  if (low == null && high == null) return "—";
  if (low == null) return money(high);
  if (high == null) return money(low);
  if (Math.abs(low - high) < 1) return money(low);
  const lowAbs = Math.abs(low);
  const highAbs = Math.abs(high);
  // Share the unit suffix when both sides land in the same magnitude.
  if (lowAbs >= 1_000_000 && highAbs < 1_000_000_000) {
    const dec = highAbs >= 10_000_000 ? 0 : 1;
    return `${EUR}${(low / 1_000_000).toFixed(dec)}–${(high / 1_000_000).toFixed(dec)}m`;
  }
  return `${money(low)}–${money(high)}`;
}

export function exact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
}

export function decimal(value: number | null | undefined, places = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(places);
}

export function percent(value: number | null | undefined, places = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(places)}%`;
}

export function multiple(value: number | null | undefined, places = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(places)}×`;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function date(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return DATE.format(d);
}

export function monthYear(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(d);
}

export function daysSince(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function relativeDays(value: Date | string | null | undefined): string {
  const days = daysSince(value);
  if (days === null) return "never";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 45) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

/** "18 months" — used by stale-data warnings. */
export function ageLabel(value: Date | string | null | undefined): string {
  const days = daysSince(value);
  if (days === null) return "never verified";
  const months = Math.round(days / 30.44);
  if (months < 1) return "this month";
  if (months === 1) return "1 month ago";
  if (months < 24) return `${months} months ago`;
  return `${(months / 12).toFixed(1)} years ago`;
}

export function ratio(value: number | null | undefined, places = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(places)}:1`;
}
