"use client";

import { useMemo, useState } from "react";
import {
  modelAllStructures,
  STRUCTURE_LABELS,
  type StructureAssumptions,
  type StructureType,
} from "@/lib/engine/structures";
import {
  evaluateStructuresAgainstObjectives,
  OBJECTIVE_LABELS,
  type FounderObjective,
  type RankedObjective,
} from "@/lib/engine/legacy";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score";
import { DecisionSupportNote } from "@/components/ui/provenance";
import { money, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StructureLab({
  initial,
  objectives: initialObjectives,
  hasFounderProfile,
  institutionName,
}: {
  initial: StructureAssumptions;
  objectives: RankedObjective[];
  hasFounderProfile: boolean;
  institutionName: string;
}) {
  const [assumptions, setAssumptions] = useState<StructureAssumptions>(initial);
  const [objectives, setObjectives] = useState<RankedObjective[]>(initialObjectives);
  const [selected, setSelected] = useState<StructureType | null>(null);

  const outcomes = useMemo(() => modelAllStructures(assumptions), [assumptions]);
  const fits = useMemo(
    () => evaluateStructuresAgainstObjectives(outcomes, objectives),
    [outcomes, objectives],
  );

  const detail = selected ? outcomes.find((o) => o.type === selected) : null;
  const detailFit = selected ? fits.find((f) => f.type === selected) : null;

  function set<K extends keyof StructureAssumptions>(key: K, value: StructureAssumptions[K]) {
    setAssumptions((a) => ({ ...a, [key]: value }));
  }

  function move(objective: FounderObjective, direction: -1 | 1) {
    setObjectives((current) => {
      const index = current.findIndex((o) => o.objective === objective);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const a = next[index]!;
      const b = next[target]!;
      next[index] = b;
      next[target] = a;
      // Ranks are positional, so renumber after any swap.
      return next.map((o, i) => ({ ...o, rank: i + 1 }));
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Assumptions"
            action={
              <Button variant="quiet" size="sm" onClick={() => setAssumptions(initial)}>
                Reset
              </Button>
            }
          />
          <PanelBody>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 sm:grid-cols-3">
              <Num label="EBITDA before rent" value={assumptions.ebitdaPreRent} onChange={(v) => set("ebitdaPreRent", v)} prefix="€" step={50000} />
              <Num label="OpCo multiple" value={assumptions.opcoMultiple} onChange={(v) => set("opcoMultiple", v)} step={0.25} />
              <Num label="Market rent" value={assumptions.marketRent} onChange={(v) => set("marketRent", v)} prefix="€" step={25000} />
              <Pct label="Property yield" value={assumptions.propertyYield} onChange={(v) => set("propertyYield", v)} />
              <Num label="Existing net debt" value={assumptions.existingNetDebt} onChange={(v) => set("existingNetDebt", v)} prefix="€" step={100000} />
              <Pct label="Stake sold" value={assumptions.stakeSold ?? 0.7} onChange={(v) => set("stakeSold", v)} />
              <Num label="Growth capital" value={assumptions.growthCapital ?? 0} onChange={(v) => set("growthCapital", v)} prefix="€" step={500000} />
              <Num label="Recap leverage (×)" value={assumptions.recapLeverage ?? 3} onChange={(v) => set("recapLeverage", v)} step={0.25} />
              <Pct label="Exit EBITDA growth" value={assumptions.exitEbitdaGrowth ?? 0.07} onChange={(v) => set("exitEbitdaGrowth", v)} />
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Founder objectives"
            meta={
              hasFounderProfile
                ? "As recorded from the founder"
                : "Generic set — no founder objectives captured"
            }
          />
          <PanelBody>
            <ol className="space-y-1">
              {objectives.map((o, index) => (
                <li key={o.objective} className="flex items-center gap-2">
                  <span className="num w-4 text-[10px] text-stone-light">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[12px] text-ink">
                    {OBJECTIVE_LABELS[o.objective]}
                  </span>
                  <span className="flex gap-px">
                    <button
                      type="button"
                      onClick={() => move(o.objective, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${OBJECTIVE_LABELS[o.objective]} up`}
                      className="border border-rule px-1.5 text-[10px] text-graphite transition-colors hover:bg-paper disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(o.objective, 1)}
                      disabled={index === objectives.length - 1}
                      aria-label={`Move ${OBJECTIVE_LABELS[o.objective]} down`}
                      className="border border-rule px-1.5 text-[10px] text-graphite transition-colors hover:bg-paper disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-rule-soft pt-3 text-[11px] leading-relaxed text-stone">
              Re-order these and the legacy column moves with them. That is the point: the right
              structure for one founder is the wrong structure for another at the same price.
            </p>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Transaction optimizer"
          meta="Decision support, not a recommendation engine"
        />
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Structure</th>
                <th className="text-right">Founder liquidity</th>
                <th className="text-right">Control retained</th>
                <th className="text-right">Legacy</th>
                <th className="text-right">Financial outcome</th>
                <th className="text-right">Objective fit</th>
                <th className="text-right">Investor equity</th>
                <th className="text-right">Complexity</th>
                <th className="text-right">Estimated value</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((o) => {
                const fit = fits.find((f) => f.type === o.type)!;
                return (
                  <tr
                    key={o.type}
                    onClick={() => setSelected(selected === o.type ? null : o.type)}
                    className={cn("cursor-pointer", selected === o.type && "bg-paper")}
                  >
                    <td>
                      <span className="text-[12.5px] text-ink">{STRUCTURE_LABELS[o.type]}</span>
                      <div className="mt-0.5 max-w-sm text-[10.5px] leading-snug text-stone">
                        {o.description}
                      </div>
                    </td>
                    <td className="num text-right text-[11.5px]">{money(o.founderProceeds)}</td>
                    <td className="text-right text-[11.5px] text-graphite">
                      {o.stakeRetained > 0 ? percent(o.stakeRetained) : o.controlRetained ? "Full" : "None"}
                    </td>
                    <td className="text-right">
                      <span className="num text-[11.5px] text-graphite">{fit.legacyPreservation}</span>
                      <ScoreBar
                        value={fit.legacyPreservation}
                        className="mt-1 w-14"
                        tone={fit.legacyPreservation >= 75 ? "forest" : "ink"}
                      />
                    </td>
                    <td className="text-right">
                      <span className="num text-[11.5px] text-graphite">{fit.financialOutcome}</span>
                      <ScoreBar value={fit.financialOutcome} className="mt-1 w-14" />
                    </td>
                    <td className="text-right">
                      <span
                        className={cn(
                          "num text-[13px]",
                          fit.objectiveFit >= 80 ? "text-forest" : "text-ink",
                        )}
                      >
                        {fit.objectiveFit}
                      </span>
                    </td>
                    <td className="num text-right text-[11.5px]">{money(o.investorEquity)}</td>
                    <td className="num text-right text-[11.5px] text-graphite">{o.complexity}/5</td>
                    <td className="num text-right text-[11.5px]">{money(o.enterpriseValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PanelBody className="border-t border-rule-soft py-3">
          <p className="text-[11px] leading-relaxed text-stone">
            Click a row for the detail behind it. Objective fit is the weighted score against the
            ranking on the right — it is arithmetic on stated preferences, not a view on what the
            founder should do.
          </p>
        </PanelBody>
      </Panel>

      {detail && detailFit ? (
        <Panel>
          <PanelHeader
            title={detail.label}
            meta={detail.description}
            action={
              <Button variant="quiet" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            }
          />
          <PanelBody>
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <div className="eyebrow mb-2">Economics</div>
                <dl className="space-y-1.5">
                  <Row label="Enterprise value" value={money(detail.enterpriseValue)} />
                  <Row label="Equity value" value={money(detail.equityValue)} />
                  <Row label="Debt repaid" value={money(detail.debtRepaid)} />
                  <Row label="Property value" value={money(detail.propertyValue)} />
                  <Row label="Rent created" value={detail.rentImplication ? money(detail.rentImplication) : "—"} />
                  <Row label="EBITDA after rent" value={money(detail.ebitdaAfterRent)} />
                </dl>
              </div>
              <div>
                <div className="eyebrow mb-2">Founder</div>
                <dl className="space-y-1.5">
                  <Row label="Proceeds at close" value={money(detail.founderProceeds)} emphasis />
                  <Row label="Stake retained" value={percent(detail.stakeRetained)} />
                  <Row label="Control" value={detail.controlRetained ? "Retained" : "Transferred"} />
                  <Row label="Illustrative future value" value={money(detail.illustrativeFutureValue)} />
                  <Row label="Second exit proceeds" value={money(detail.secondExitProceeds)} />
                  <Row
                    label="Total illustrative"
                    value={money(detail.founderProceeds + detail.secondExitProceeds)}
                    emphasis
                  />
                </dl>
              </div>
              <div>
                <div className="eyebrow mb-2">Against the founder&apos;s objectives</div>
                <ul className="space-y-1.5">
                  {detailFit.perObjective.map((p) => (
                    <li key={p.objective}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11.5px] text-graphite">{p.label}</span>
                        <span className="num text-[11px] text-stone">
                          {p.fit} · {percent(p.weight)}
                        </span>
                      </div>
                      <ScoreBar value={p.fit} className="mt-0.5" tone={p.fit >= 80 ? "forest" : "ink"} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 border-t border-rule-soft pt-4">
              <div className="eyebrow mb-2">Notes</div>
              <ul className="space-y-1">
                {detail.notes.map((n, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-graphite">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelBody>
          <DecisionSupportNote />
        </PanelBody>
      </Panel>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn("text-[11.5px]", emphasis ? "text-ink" : "text-stone")}>{label}</dt>
      <dd className={cn("num text-[12px]", emphasis ? "text-ink" : "text-graphite")}>{value}</dd>
    </div>
  );
}

function Num({
  label, value, onChange, prefix, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {prefix ? <span className="num text-[11px] text-stone">{prefix}</span> : null}
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num h-6.5 text-[11.5px]"
        />
      </div>
    </div>
  );
}

function Pct({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={0.5}
          value={Math.round(value * 1000) / 10}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="num h-6.5 text-[11.5px]"
        />
        <span className="num text-[11px] text-stone">%</span>
      </div>
    </div>
  );
}
