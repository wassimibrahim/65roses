import * as React from "react";
import { cn } from "@/lib/utils";

function toneFor(score: number) {
  if (score >= 80) return "text-forest";
  if (score >= 60) return "text-ink";
  if (score >= 40) return "text-graphite";
  return "text-stone";
}

/** The Terra Opportunity Score™ mark. Large, serif, never decorated. */
export function ScoreMark({
  score,
  size = "md",
  label,
  overridden = false,
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  overridden?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: "text-[15px]",
    md: "text-[22px]",
    lg: "text-[34px]",
    xl: "text-[52px]",
  } as const;
  return (
    <div className={cn("flex flex-col", className)}>
      {label ? <span className="eyebrow mb-0.5">{label}</span> : null}
      <span
        className={cn("num leading-none tabular-nums", sizes[size], toneFor(score))}
        title={overridden ? "Partner override applied" : undefined}
      >
        {Math.round(score)}
        {overridden ? <span className="ml-1 align-super text-[9px] text-gold">†</span> : null}
      </span>
    </div>
  );
}

/** Horizontal subscore bar used across scoring and matching explanations. */
export function ScoreBar({
  value,
  max = 100,
  tone = "ink",
  className,
}: {
  value: number;
  max?: number;
  tone?: "ink" | "forest" | "burgundy" | "gold";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = {
    ink: "bg-charcoal",
    forest: "bg-forest",
    burgundy: "bg-burgundy",
    gold: "bg-gold",
  }[tone];
  return (
    <div className={cn("h-1 w-full bg-parchment", className)}>
      <div className={cn("h-full", bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 1–5 relationship strength, rendered as filled marks. */
export function StrengthMarks({
  strength,
  className,
}: {
  strength: number;
  className?: string;
}) {
  const labels = ["No relationship", "Weak", "Known", "Warm", "Trusted"];
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={labels[Math.max(0, Math.min(4, strength - 1))]}
    >
      <span className="inline-flex gap-px" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-[3px]",
              i <= strength ? (strength >= 4 ? "bg-forest" : "bg-graphite") : "bg-linen",
            )}
          />
        ))}
      </span>
      <span className="text-[11px] text-graphite">
        {labels[Math.max(0, Math.min(4, strength - 1))]}
      </span>
    </span>
  );
}
