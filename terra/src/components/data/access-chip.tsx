import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  DIRECT: "Direct relationship",
  WARM_INTRODUCTION: "Warm introduction",
  SECOND_DEGREE: "Second degree",
  COLD: "Cold",
};

const TONE: Record<string, string> = {
  DIRECT: "text-forest",
  WARM_INTRODUCTION: "text-forest",
  SECOND_DEGREE: "text-graphite",
  COLD: "text-stone",
};

/** How Terra actually reaches this counterparty. */
export function AccessChip({ tier, className }: { tier: string; className?: string }) {
  const filled = tier === "DIRECT" ? 3 : tier === "WARM_INTRODUCTION" ? 2 : tier === "SECOND_DEGREE" ? 1 : 0;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px]", TONE[tier] ?? "text-stone", className)}>
      <span className="inline-flex gap-px" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2 w-[3px]", i <= filled ? "bg-current" : "bg-linen")} />
        ))}
      </span>
      {LABEL[tier] ?? tier}
    </span>
  );
}
