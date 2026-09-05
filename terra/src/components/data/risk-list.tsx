import { Badge } from "@/components/ui/badge";
import { humanise } from "@/lib/utils";

const SEVERITY_TONE: Record<string, "neutral" | "burgundy" | "quiet"> = {
  LOW: "quiet",
  MODERATE: "neutral",
  HIGH: "burgundy",
  CRITICAL: "burgundy",
};

/** A flag without a rationale is noise, so the rationale is always rendered. */
export function RiskList({
  risks,
}: {
  risks: { id: string; type: string; severity: string; rationale: string; mitigation?: string | null }[];
}) {
  return (
    <ul>
      {risks.map((risk) => (
        <li key={risk.id} className="border-b border-rule-soft px-4 py-3 last:border-b-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[12.5px] text-ink">{humanise(risk.type)}</span>
            <Badge tone={SEVERITY_TONE[risk.severity] ?? "neutral"} mono>
              {humanise(risk.severity)}
            </Badge>
          </div>
          <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-graphite">{risk.rationale}</p>
          {risk.mitigation ? (
            <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-stone">
              <span className="eyebrow mr-1.5">Mitigation</span>
              {risk.mitigation}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
