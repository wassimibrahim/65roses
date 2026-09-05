import Link from "next/link";
import type { NamedMatch } from "@/server/matching";
import { ScoreBar } from "@/components/ui/score";
import { Badge } from "@/components/ui/badge";
import { humanise } from "@/lib/utils";

/** Ranked buyers with their reasons and, always, their issues. */
export function MatchList({
  matches,
  emptyLabel = "No mandate currently fits.",
  showDimensions = true,
}: {
  matches: NamedMatch[];
  emptyLabel?: string;
  showDimensions?: boolean;
}) {
  if (matches.length === 0) {
    return <p className="px-4 py-6 text-center text-[12px] text-stone">{emptyLabel}</p>;
  }

  return (
    <ul>
      {matches.map((m) => (
        <li key={m.mandateId} className="border-b border-rule-soft px-4 py-3.5 last:border-b-0">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] text-ink">{m.organisationName}</span>
                <Badge tone="quiet" mono>{humanise(m.organisationType)}</Badge>
                {!m.isActive ? <Badge tone="quiet" mono>Mandate not live</Badge> : null}
              </div>
              <p className="mt-0.5 text-[10.5px] text-stone">{m.mandateName}</p>

              {m.reasons.length > 0 ? (
                <ul className="mt-2 space-y-0.5">
                  {m.reasons.slice(0, 4).map((r, i) => (
                    <li key={i} className="flex gap-1.5 text-[11.5px] leading-relaxed text-graphite">
                      <span className="text-forest">+</span>
                      {r}
                    </li>
                  ))}
                </ul>
              ) : null}

              {m.issues.length > 0 ? (
                <div className="mt-2">
                  <span className="eyebrow">Potential issues</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {m.issues.slice(0, 3).map((issue, i) => (
                      <li key={i} className="flex gap-1.5 text-[11.5px] leading-relaxed text-stone">
                        <span className="text-burgundy">−</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {showDimensions ? (
                <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-3 lg:grid-cols-5">
                  {m.dimensions.slice(0, 10).map((d) => (
                    <div key={d.key}>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[9.5px] text-stone">{d.label}</span>
                        <span className="num text-[9.5px] text-graphite">{d.raw.toFixed(0)}</span>
                      </div>
                      <ScoreBar value={d.raw} className="mt-0.5 h-px" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              <span
                className={`num text-[22px] leading-none ${m.score >= 80 ? "text-forest" : m.score >= 60 ? "text-ink" : "text-stone"}`}
              >
                {m.score}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
