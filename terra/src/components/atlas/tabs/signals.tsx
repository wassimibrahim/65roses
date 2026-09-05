import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel";
import { AssertionTag, ConfidenceMeter } from "@/components/ui/provenance";
import { Badge } from "@/components/ui/badge";
import { date, relativeDays } from "@/lib/format";
import { humanise } from "@/lib/utils";

const STRENGTH_TONE: Record<string, "quiet" | "neutral" | "forest"> = {
  WEAK: "quiet",
  MODERATE: "neutral",
  STRONG: "forest",
};

export function SignalsTab({ profile }: { profile: InstitutionProfile }) {
  const { record } = profile;

  if (record.signals.length === 0) {
    return <EmptyState title="No signals recorded." hint="Signals are the raw material of origination." />;
  }

  return (
    <Panel>
      <PanelHeader
        title="Signals"
        meta={`${record.signals.length} recorded`}
        action={
          <span className="text-[10.5px] text-stone">
            Observation and interpretation are shown separately
          </span>
        }
      />
      <ul>
        {record.signals.map((signal) => (
          <li key={signal.id} className="border-b border-rule-soft px-4 py-4 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STRENGTH_TONE[signal.strength] ?? "neutral"} mono>
                  {humanise(signal.type)}
                </Badge>
                <ConfidenceMeter confidence={signal.confidence} showLabel />
              </div>
              <span className="num text-[10.5px] text-stone">
                {date(signal.date)} · {relativeDays(signal.date)}
              </span>
            </div>

            <p className="mt-2 text-[13px] leading-snug text-ink">{signal.headline}</p>
            {signal.detail ? (
              <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-graphite">{signal.detail}</p>
            ) : null}

            {signal.interpretation ? (
              <div className="mt-3 border-l-2 border-linen pl-3">
                <div className="mb-1 flex items-center gap-2">
                  <AssertionTag assertion="TERRA_HYPOTHESIS" />
                </div>
                <p className="max-w-3xl text-[11.5px] leading-relaxed text-graphite">
                  {signal.interpretation}
                </p>
                {signal.transactionImplication ? (
                  <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-stone">
                    {signal.transactionImplication}
                  </p>
                ) : null}
              </div>
            ) : null}

            {signal.source ? (
              <p className="mt-2 text-[10.5px] text-stone-light">Source: {signal.source.name}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
