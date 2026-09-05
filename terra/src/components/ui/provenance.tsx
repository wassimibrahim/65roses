import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ageLabel } from "@/lib/format";

/**
 * Source vs inference (spec §33) — the discipline the whole product rests on.
 * FACT · ESTIMATE · SIGNAL · TERRA HYPOTHESIS are never blurred into each other.
 */
export type Assertion = "FACT" | "ESTIMATE" | "SIGNAL" | "TERRA_HYPOTHESIS";
export type ConfidenceLevel = "VERIFIED" | "HIGH_CONFIDENCE" | "ESTIMATED" | "UNVERIFIED";
export type Basis =
  | "REPORTED"
  | "MANAGEMENT"
  | "TERRA_ESTIMATE"
  | "DERIVED"
  | "MARKET_ASSUMPTION";

const ASSERTION_LABEL: Record<Assertion, string> = {
  FACT: "Fact",
  ESTIMATE: "Estimate",
  SIGNAL: "Signal",
  TERRA_HYPOTHESIS: "Terra hypothesis",
};

const ASSERTION_CLASS: Record<Assertion, string> = {
  FACT: "border-rule bg-paper text-graphite",
  ESTIMATE: "border-gold/30 bg-gold-soft text-amber",
  SIGNAL: "border-forest/25 bg-forest-soft text-forest",
  TERRA_HYPOTHESIS: "border-burgundy/25 bg-burgundy-soft text-burgundy",
};

export function AssertionTag({
  assertion,
  className,
}: {
  assertion: Assertion;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs border px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em]",
        ASSERTION_CLASS[assertion],
        className,
      )}
      title={
        assertion === "TERRA_HYPOTHESIS"
          ? "Terra interpretation — not established fact"
          : ASSERTION_LABEL[assertion]
      }
    >
      {ASSERTION_LABEL[assertion]}
    </span>
  );
}

const BASIS_LABEL: Record<Basis, string> = {
  REPORTED: "Reported",
  MANAGEMENT: "Management",
  TERRA_ESTIMATE: "Terra estimate",
  DERIVED: "Derived",
  MARKET_ASSUMPTION: "Market assumption",
};

/** A financial figure never appears without saying what kind of figure it is. */
export function BasisTag({ basis, className }: { basis: Basis; className?: string }) {
  const isReported = basis === "REPORTED" || basis === "MANAGEMENT";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs border px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em]",
        isReported ? "border-rule bg-paper text-graphite" : "border-gold/30 bg-gold-soft text-amber",
        className,
      )}
    >
      {BASIS_LABEL[basis]}
    </span>
  );
}

const CONFIDENCE_ORDER: ConfidenceLevel[] = [
  "UNVERIFIED",
  "ESTIMATED",
  "HIGH_CONFIDENCE",
  "VERIFIED",
];

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  VERIFIED: "Verified",
  HIGH_CONFIDENCE: "High confidence",
  ESTIMATED: "Estimated",
  UNVERIFIED: "Unverified",
};

/** Four ticks. Filled ticks = confidence. Cheap to read at a glance. */
export function ConfidenceMeter({
  confidence,
  showLabel = false,
  className,
}: {
  confidence: ConfidenceLevel;
  showLabel?: boolean;
  className?: string;
}) {
  const level = CONFIDENCE_ORDER.indexOf(confidence) + 1;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={CONFIDENCE_LABEL[confidence]}>
      <span className="inline-flex gap-px" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-2.5 w-[3px]", i <= level ? "bg-graphite" : "bg-linen")}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="text-[10.5px] text-stone">{CONFIDENCE_LABEL[confidence]}</span>
      ) : null}
      <span className="sr-only">{CONFIDENCE_LABEL[confidence]}</span>
    </span>
  );
}

/** "Student count last verified 19 months ago." */
export function StaleNotice({
  field,
  lastVerified,
  thresholdMonths = 12,
}: {
  field: string;
  lastVerified: Date | string | null | undefined;
  thresholdMonths?: number;
}) {
  const ms = lastVerified ? Date.now() - new Date(lastVerified).getTime() : Infinity;
  const months = ms / (1000 * 60 * 60 * 24 * 30.44);
  if (months < thresholdMonths) return null;
  return (
    <p className="flex items-center gap-1.5 text-[10.5px] text-amber">
      <span className="inline-block size-1 rounded-full bg-gold" aria-hidden />
      {field} last verified {ageLabel(lastVerified)}.
    </p>
  );
}

/** Fixed footer note wherever fabricated numbers appear. */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <p className={cn("font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone-light", className)}>
      Illustrative demo data
    </p>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="quiet" mono className="border border-dashed border-rule">
      Illustrative
    </Badge>
  );
}

/** Every recommendation in Terra OS carries this. Data never replaces judgment. */
export function DecisionSupportNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10.5px] leading-relaxed text-stone", className)}>
      Decision support. Terra OS structures evidence and surfaces options — it does not
      replace partner judgment. Scores, matches and structures are overridable.
    </p>
  );
}
