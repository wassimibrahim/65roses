"use client";

import { useMemo, useState } from "react";
import {
  runUnderwriting,
  scenarioSet,
  type UnderwritingAssumptions,
} from "@/lib/engine/underwriting";
import { computeReturns, entryExitMatrix, growthMarginMatrix } from "@/lib/engine/returns";
import { evFromMultiple, sumOfTheParts, valueProperty } from "@/lib/engine/valuation";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DecisionSupportNote, BasisTag } from "@/components/ui/provenance";
import { money, moneyRange, percent, exact, multiple, decimal } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ModelProps {
  initial: UnderwritingAssumptions;
  marketRent: number;
  propertyValue: { low: number; high: number } | null;
  netDebt: number;
  compMultiples: { low: number; median: number; high: number } | null;
  history: { year: number; revenue: number | null; ebitda: number | null; students: number | null; basis: string }[];
  institutionName: string;
}

type Scenario = "DOWNSIDE" | "BASE" | "UPSIDE";

/**
 * The whole model runs in the browser. The engine is pure TypeScript with no
 * server dependency, so moving an assumption re-prices the asset instantly —
 * which is the only way this is usable during a live conversation.
 */
export function UnderwritingModel(props: ModelProps) {
  const [assumptions, setAssumptions] = useState<UnderwritingAssumptions>(props.initial);
  const [scenario, setScenario] = useState<Scenario>("BASE");
  const [exitMultiple, setExitMultiple] = useState(props.compMultiples?.median ?? 10.5);
  const [leverage, setLeverage] = useState(3);

  const scenarios = useMemo(() => scenarioSet(assumptions), [assumptions]);
  const results = useMemo(
    () => ({
      DOWNSIDE: runUnderwriting(scenarios.DOWNSIDE),
      BASE: runUnderwriting(scenarios.BASE),
      UPSIDE: runUnderwriting(scenarios.UPSIDE),
    }),
    [scenarios],
  );
  const active = results[scenario];

  const owned = props.marketRent > 0;
  const entryEbitda = active.summary.entryEbitda;
  // With an owned campus the operating company must carry a market rent before
  // any multiple is applied to it.
  const opcoEbitda = owned ? entryEbitda - props.marketRent : entryEbitda;

  const valuation = useMemo(() => {
    const low = props.compMultiples?.low ?? 9;
    const high = props.compMultiples?.high ?? 12;
    const opco = opcoEbitda > 0 ? evFromMultiple(opcoEbitda, low, high) : null;
    const propco = owned
      ? props.propertyValue ?? valueProperty({ marketRent: props.marketRent, yieldLow: 0.055, yieldHigh: 0.065 })
      : null;
    return sumOfTheParts({ opco, propco, netDebt: props.netDebt });
  }, [opcoEbitda, owned, props.compMultiples, props.propertyValue, props.marketRent, props.netDebt]);

  const returnsInput = useMemo(() => {
    const entryEv = opcoEbitda * (props.compMultiples?.median ?? 10.5);
    return {
      entryEv,
      entryDebt: opcoEbitda * leverage,
      entryEbitda: opcoEbitda,
      entryRevenue: active.summary.entryRevenue,
      revenueCagr: active.summary.revenueCagr,
      marginExpansion: active.summary.exitMargin - active.summary.entryMargin,
      holdYears: assumptions.years - 1,
      exitMultiple,
      cumulativeFcf: Math.max(0, active.summary.cumulativeFcf),
    };
  }, [opcoEbitda, leverage, active.summary, assumptions.years, exitMultiple, props.compMultiples]);

  const returns = useMemo(() => computeReturns(returnsInput), [returnsInput]);
  const entryMultiples = useMemo(() => {
    const base = props.compMultiples?.median ?? 10.5;
    return [base - 1.5, base - 0.75, base, base + 0.75, base + 1.5].map((v) => Math.round(v * 4) / 4);
  }, [props.compMultiples]);
  const exitMultiples = useMemo(
    () => entryMultiples.map((v) => Math.round((v + 0.5) * 4) / 4),
    [entryMultiples],
  );
  const matrix = useMemo(
    () => entryExitMatrix(returnsInput, entryMultiples, exitMultiples),
    [returnsInput, entryMultiples, exitMultiples],
  );
  const growthMatrix = useMemo(
    () =>
      growthMarginMatrix(
        returnsInput,
        [0.01, 0.03, 0.05, 0.07, 0.09],
        [-0.02, 0, 0.02, 0.04, 0.06],
      ),
    [returnsInput],
  );

  function set<K extends keyof UnderwritingAssumptions>(key: K, value: UnderwritingAssumptions[K]) {
    setAssumptions((a) => ({ ...a, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {/* ── Assumptions ───────────────────────────────────────────────────── */}
      <Panel>
        <PanelHeader
          title="Assumptions"
          meta="Every figure below is editable; the model re-prices as you type"
          action={
            <Button variant="quiet" size="sm" onClick={() => setAssumptions(props.initial)}>
              Reset
            </Button>
          }
        />
        <PanelBody>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-5">
            <Num label="Students" value={assumptions.students} onChange={(v) => set("students", v)} />
            <Num label="Capacity" value={assumptions.capacity} onChange={(v) => set("capacity", v)} />
            <Pct label="Student growth" value={assumptions.studentGrowth} onChange={(v) => set("studentGrowth", v)} />
            <Num label="Tuition" value={assumptions.tuition} onChange={(v) => set("tuition", v)} prefix="€" />
            <Pct label="Tuition growth" value={assumptions.tuitionGrowth} onChange={(v) => set("tuitionGrowth", v)} />
            <Num
              label="Other rev / student"
              value={assumptions.otherRevenuePerStudent}
              onChange={(v) => set("otherRevenuePerStudent", v)}
              prefix="€"
            />
            <Num
              label="Student / teacher"
              value={assumptions.studentTeacherRatio}
              onChange={(v) => set("studentTeacherRatio", v)}
              step={0.5}
            />
            <Num
              label="Teacher cost"
              value={assumptions.teacherCost}
              onChange={(v) => set("teacherCost", v)}
              prefix="€"
            />
            <Pct
              label="Teacher cost growth"
              value={assumptions.teacherCostGrowth}
              onChange={(v) => set("teacherCostGrowth", v)}
            />
            <Pct
              label="Non-teaching uplift"
              value={assumptions.nonTeachingStaffRatio}
              onChange={(v) => set("nonTeachingStaffRatio", v)}
            />
            <Num
              label="Other opex / student"
              value={assumptions.otherOpexPerStudent}
              onChange={(v) => set("otherOpexPerStudent", v)}
              prefix="€"
            />
            <Num label="Rent" value={assumptions.rent} onChange={(v) => set("rent", v)} prefix="€" />
            <Pct label="Rent indexation" value={assumptions.rentIndexation} onChange={(v) => set("rentIndexation", v)} />
            <Num
              label="Maint. capex / student"
              value={assumptions.maintenanceCapexPerStudent}
              onChange={(v) => set("maintenanceCapexPerStudent", v)}
              prefix="€"
            />
            <Pct label="Tax rate" value={assumptions.taxRate} onChange={(v) => set("taxRate", v)} />
          </div>

          {owned ? (
            <p className="mt-4 border-t border-rule-soft pt-3 text-[11px] leading-relaxed text-stone">
              The campus is owned, so rent is zero in the operating model. A market rent of{" "}
              <span className="num text-graphite">{money(props.marketRent)}</span> is charged
              separately when the operating company is valued on its own.
            </p>
          ) : null}
        </PanelBody>
      </Panel>

      {/* ── Scenario switch ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1">Scenario</span>
        {(["DOWNSIDE", "BASE", "UPSIDE"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScenario(s)}
            className={cn(
              "rounded-sm border px-2.5 py-1 text-[11.5px] transition-colors",
              scenario === s
                ? "border-ink bg-ink text-ivory"
                : "border-rule bg-ivory text-graphite hover:bg-paper",
            )}
          >
            {s[0] + s.slice(1).toLowerCase()}
          </button>
        ))}
        <span className="ml-3 text-[10.5px] text-stone">
          Downside and upside move enrolment, pricing and cost growth around the base case.
        </span>
      </div>

      {/* ── Projection ────────────────────────────────────────────────────── */}
      <Panel>
        <PanelHeader
          title="Projection"
          meta={`${assumptions.years}-year model · ${scenario[0] + scenario.slice(1).toLowerCase()} case`}
          action={<BasisTag basis="TERRA_ESTIMATE" />}
        />
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-paper">Line</th>
                {props.history.map((h) => (
                  <th key={`h${h.year}`} className="text-right text-stone-light">
                    FY{h.year}A
                  </th>
                ))}
                {active.years.map((y) => (
                  <th key={y.year} className="text-right">
                    FY{y.year}E
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row
                label="Students"
                history={props.history.map((h) => exact(h.students))}
                values={active.years.map((y) => exact(y.students))}
              />
              <Row
                label="Utilisation"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => percent(y.utilisation))}
              />
              <Row
                label="Tuition"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => money(y.tuition))}
              />
              <Row
                label="Revenue"
                history={props.history.map((h) => money(h.revenue))}
                values={active.years.map((y) => money(y.revenue))}
                emphasis
              />
              <Row
                label="Revenue growth"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => percent(y.revenueGrowth, 1))}
              />
              <Row
                label="Staff cost"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => `(${money(y.staffCost)})`)}
              />
              <Row
                label="Other opex"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => `(${money(y.otherOpex)})`)}
              />
              <Row
                label="Rent"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => (y.rent ? `(${money(y.rent)})` : "—"))}
              />
              <Row
                label="EBITDA"
                history={props.history.map((h) => money(h.ebitda))}
                values={active.years.map((y) => money(y.ebitda))}
                emphasis
              />
              <Row
                label="EBITDA margin"
                history={props.history.map((h) =>
                  h.revenue && h.ebitda ? percent(h.ebitda / h.revenue) : "—",
                )}
                values={active.years.map((y) => percent(y.ebitdaMargin))}
              />
              <Row
                label="Maintenance capex"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => `(${money(y.maintenanceCapex)})`)}
              />
              <Row
                label="Tax"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => `(${money(y.tax)})`)}
              />
              <Row
                label="Free cash flow"
                history={props.history.map(() => "—")}
                values={active.years.map((y) => money(y.freeCashFlow))}
                emphasis
              />
            </tbody>
          </table>
        </div>
        <PanelBody className="border-t border-rule-soft py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 lg:grid-cols-6">
            <Metric label="Revenue CAGR" value={percent(active.summary.revenueCagr, 1)} />
            <Metric label="EBITDA CAGR" value={percent(active.summary.ebitdaCagr, 1)} />
            <Metric label="Entry margin" value={percent(active.summary.entryMargin)} />
            <Metric label="Exit margin" value={percent(active.summary.exitMargin)} />
            <Metric label="Exit EBITDA" value={money(active.summary.exitEbitda)} />
            <Metric label="Cumulative FCF" value={money(active.summary.cumulativeFcf)} />
          </div>
        </PanelBody>
      </Panel>

      {/* ── Valuation ─────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Valuation"
            meta={
              props.compMultiples
                ? `${multiple(props.compMultiples.low)}–${multiple(props.compMultiples.high)} EV/EBITDA from precedent transactions`
                : "No comparable set"
            }
          />
          <PanelBody className="space-y-3">
            {owned ? (
              <>
                <Line label="EBITDA before rent" value={money(entryEbitda)} />
                <Line label="Market rent" value={`(${money(props.marketRent)})`} />
                <Line label="EBITDA after rent" value={money(opcoEbitda)} emphasis />
              </>
            ) : (
              <Line label="EBITDA" value={money(entryEbitda)} emphasis />
            )}

            <div className="space-y-2 border-t border-rule pt-3">
              <Line
                label="Operating company"
                value={valuation.opco ? moneyRange(valuation.opco.low, valuation.opco.high) : "—"}
              />
              <Line
                label="Campus freehold"
                value={valuation.propco ? moneyRange(valuation.propco.low, valuation.propco.high) : "n/a — leased"}
              />
              <Line
                label="Combined enterprise value"
                value={valuation.combined ? moneyRange(valuation.combined.low, valuation.combined.high) : "—"}
                emphasis
              />
              <Line label="Net debt" value={`(${money(props.netDebt)})`} />
              <Line
                label="Equity value"
                value={valuation.equity ? moneyRange(valuation.equity.low, valuation.equity.high) : "—"}
                emphasis
              />
            </div>

            <p className="pt-1 text-[10.5px] leading-relaxed text-stone">
              A range, not a number. The operating company is priced on precedent multiples applied
              to rent-adjusted earnings; the campus is capitalised separately on an institutional
              yield.
            </p>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Returns" meta="Investor-side view of the operating company" />
          <PanelBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <NumInline label="Exit multiple" value={exitMultiple} onChange={setExitMultiple} step={0.25} />
              <NumInline label="Entry leverage (× EBITDA)" value={leverage} onChange={setLeverage} step={0.25} />
            </div>
            <div className="space-y-2 border-t border-rule-soft pt-3">
              <Line label="Entry enterprise value" value={money(returns.entryEv)} />
              <Line label="Entry debt" value={`(${money(returnsInput.entryDebt)})`} />
              <Line label="Entry equity" value={money(returns.entryEquity)} emphasis />
              <Line label="Entry multiple" value={multiple(returns.entryMultiple)} />
            </div>
            <div className="space-y-2 border-t border-rule-soft pt-3">
              <Line label="Exit EBITDA" value={money(returns.exitEbitda)} />
              <Line label="Exit enterprise value" value={money(returns.exitEv)} />
              <Line label="Exit net debt" value={`(${money(returns.exitNetDebt)})`} />
              <Line label="Exit equity" value={money(returns.exitEquity)} emphasis />
            </div>
            <div className="flex items-end gap-8 border-t border-rule pt-3">
              <div>
                <div className="eyebrow mb-1">MOIC</div>
                <div className={cn("num text-[26px] leading-none", returns.moic >= 2 ? "text-forest" : "text-ink")}>
                  {decimal(returns.moic, 2)}×
                </div>
              </div>
              <div>
                <div className="eyebrow mb-1">IRR</div>
                <div className={cn("num text-[26px] leading-none", returns.irr >= 0.2 ? "text-forest" : "text-ink")}>
                  {percent(returns.irr, 1)}
                </div>
              </div>
              <div className="pb-1 text-[10.5px] text-stone">
                Over a {returnsInput.holdYears}-year hold
              </div>
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* ── Sensitivities ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Entry × exit multiple" meta="MOIC" />
          <Matrix
            matrix={matrix}
            format={(v) => `${v.toFixed(2)}×`}
            rowFormat={(v) => multiple(v)}
            colFormat={(v) => multiple(v)}
            good={(v) => v >= 2}
          />
        </Panel>
        <Panel>
          <PanelHeader title="Revenue CAGR × margin expansion" meta="IRR" />
          <Matrix
            matrix={growthMatrix}
            useIrr
            format={(v) => percent(v, 0)}
            rowFormat={(v) => percent(v, 0)}
            colFormat={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}pt`}
            good={(v) => v >= 0.2}
          />
        </Panel>
      </div>

      <Panel>
        <PanelBody>
          <DecisionSupportNote />
        </PanelBody>
      </Panel>
    </div>
  );
}

function Row({
  label,
  history,
  values,
  emphasis,
}: {
  label: string;
  history: string[];
  values: string[];
  emphasis?: boolean;
}) {
  return (
    <tr>
      <td
        className={cn(
          "sticky left-0 z-10 bg-ivory text-[11.5px]",
          emphasis ? "text-ink" : "text-graphite",
        )}
      >
        {label}
      </td>
      {history.map((h, i) => (
        <td key={`h${i}`} className="num text-right text-[11px] text-stone">
          {h}
        </td>
      ))}
      {values.map((v, i) => (
        <td
          key={i}
          className={cn("num text-right text-[11.5px]", emphasis ? "text-ink" : "text-graphite")}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="num mt-0.5 text-[13px] text-ink">{value}</div>
    </div>
  );
}

function Line({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cn("text-[12px]", emphasis ? "text-ink" : "text-graphite")}>{label}</span>
      <span className={cn("num text-[12.5px]", emphasis ? "text-ink" : "text-graphite")}>{value}</span>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  prefix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  step?: number;
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

function Pct({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
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

function NumInline({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="num h-6.5 text-[11.5px]"
      />
    </div>
  );
}

function Matrix({
  matrix,
  format,
  rowFormat,
  colFormat,
  good,
  useIrr,
}: {
  matrix: { rows: { label: string; values: number[] }; cols: { label: string; values: number[] }; moic: number[][]; irr: number[][] };
  format: (v: number) => string;
  rowFormat: (v: number) => string;
  colFormat: (v: number) => string;
  good: (v: number) => boolean;
  useIrr?: boolean;
}) {
  const data = useIrr ? matrix.irr : matrix.moic;
  return (
    <div className="overflow-x-auto">
      <table className="grid-table">
        <thead>
          <tr>
            <th className="text-stone-light">
              {matrix.rows.label} ↓ / {matrix.cols.label} →
            </th>
            {matrix.cols.values.map((c) => (
              <th key={c} className="text-right">
                {colFormat(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.values.map((r, i) => (
            <tr key={r}>
              <td className="num text-[11.5px] text-graphite">{rowFormat(r)}</td>
              {data[i]!.map((v, j) => (
                <td
                  key={j}
                  className={cn(
                    "num text-right text-[11.5px]",
                    good(v) ? "bg-forest-soft text-forest" : v <= 0 ? "text-burgundy" : "text-graphite",
                  )}
                >
                  {format(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
