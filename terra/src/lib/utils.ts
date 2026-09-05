import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Title-cases a SCREAMING_SNAKE enum for display. */
export function humanise(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/\bK12\b/i, "K–12")
    .replace(/\bIb\b/, "IB")
    .replace(/\bIoi\b/, "IOI")
    .replace(/\bLoi\b/, "LOI")
    .replace(/\bNda\b/, "NDA")
    .replace(/\bCim\b/, "CIM")
    .replace(/\bSpa\b/, "SPA")
    .replace(/\bEsg\b/, "ESG")
    .replace(/\bCeo\b/, "CEO")
    .replace(/\bPe\b/, "PE")
    .replace(/\bRe\b/, "RE")
    .replace(/\bReit\b/, "REIT")
    .replace(/\bPropco\b/i, "PropCo")
    .replace(/\bOpco\b/i, "OpCo");
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Deterministic 0..1 hash — used for stable pseudo-random demo jitter. */
export function hashUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
