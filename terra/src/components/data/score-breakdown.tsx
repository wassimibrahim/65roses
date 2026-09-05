import type { ScoreResult } from "@/lib/engine/types";
import { ScoreBar } from "@/components/ui/score";
import { DecisionSupportNote } from "@/components/ui/provenance";
import { percent } from "@/lib/format";

/**
 * The score, opened up. No black boxes: every dimension shows its weight, its
 * raw value, what drove it and what argues against it.
 */
export function ScoreBreakdown({
  score,
  overrideRationale,
}: {
  score: ScoreResult;
  overrideRationale?: string | null;
}) {
  return (
    <div className="space-y-5">
      {overrideRationale ? (
        <div className="border-l-2 border-gold bg-gold-soft/50 px-3 py-2.5">
          <div className="eyebrow mb-1">Partner override</div>
          <p className="text-[12px] leading-relaxed text-graphite">{overrideRationale}</p>
        </div>
      ) : null}

      <ul className="space-y-4">
        {score.dimensions.map((dim) => (
          <li key={dim.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] text-ink">{dim.label}</span>
              <span className="num shrink-0 text-[11px] text-stone">
                {dim.raw.toFixed(0)}
                <span className="text-stone-light"> × {percent(dim.weight)} = </span>
                <span className="text-graphite">{dim.weighted.toFixed(1)}</span>
              </span>
            </div>
            <ScoreBar value={dim.raw} className="mt-1.5" tone={dim.raw >= 75 ? "forest" : "ink"} />
            {dim.drivers.length > 0 ? (
              <ul className="mt-2 space-y-0.5">
                {dim.drivers.map((driver, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-graphite">
                    <span className="text-forest">+</span>
                    {driver}
                  </li>
                ))}
              </ul>
            ) : null}
            {dim.detractors.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {dim.detractors.map((d, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-stone">
                    <span className="text-burgundy">−</span>
                    {d}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {score.gaps.length > 0 ? (
        <div className="border-t border-rule-soft pt-3">
          <div className="eyebrow mb-1.5">What we do not know</div>
          <ul className="space-y-0.5">
            {score.gaps.map((gap, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-amber">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DecisionSupportNote className="border-t border-rule-soft pt-3" />
    </div>
  );
}
