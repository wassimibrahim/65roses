import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { BasisTag, DemoNotice } from "@/components/ui/provenance";
import { money, percent, exact } from "@/lib/format";
import { RevenueChart } from "@/components/charts/revenue-chart";

export function FinancialsTab({ profile }: { profile: InstitutionProfile }) {
  const { record, scored } = profile;
  const years = record.financials;

  if (years.length === 0) {
    return <EmptyState title="No financial record yet." hint="Add an estimate or a management set." />;
  }

  const rows: { label: string; key: keyof (typeof years)[number]; format: (v: number | null) => string; emphasis?: boolean }[] = [
    { label: "Students", key: "students", format: (v) => exact(v) },
    { label: "Average tuition", key: "averageTuition", format: (v) => money(v) },
    { label: "Revenue", key: "revenue", format: (v) => money(v), emphasis: true },
    { label: "Revenue growth", key: "revenueGrowth", format: (v) => percent(v, 1) },
    { label: "EBITDA", key: "ebitda", format: (v) => money(v), emphasis: true },
    { label: "EBITDA margin", key: "ebitdaMargin", format: (v) => percent(v) },
    { label: "EBIT", key: "ebit", format: (v) => money(v) },
    { label: "Net income", key: "netIncome", format: (v) => money(v) },
    { label: "Rent", key: "rent", format: (v) => money(v) },
    { label: "Capex", key: "capex", format: (v) => money(v) },
    { label: "Working capital", key: "workingCapital", format: (v) => money(v) },
    { label: "Net debt", key: "netDebt", format: (v) => money(v) },
    { label: "Cash", key: "cash", format: (v) => money(v) },
  ];

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Financial history"
          meta="All figures illustrative"
          action={<span className="text-[10.5px] text-stone">Currency: EUR</span>}
        />
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-paper">Line</th>
                {years.map((y) => (
                  <th key={y.id} className="text-right">
                    <div>FY{y.year}</div>
                    <div className="mt-0.5 font-normal normal-case tracking-normal">
                      <BasisTag basis={y.basis} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td
                    className={`sticky left-0 z-10 bg-ivory text-[11.5px] ${row.emphasis ? "text-ink" : "text-graphite"}`}
                  >
                    {row.label}
                  </td>
                  {years.map((y) => (
                    <td
                      key={y.id}
                      className={`num text-right text-[11.5px] ${row.emphasis ? "text-ink" : "text-graphite"}`}
                    >
                      {row.format(y[row.key] as number | null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PanelBody className="border-t border-rule-soft py-3">
          <p className="text-[11px] leading-relaxed text-stone">
            {years[years.length - 1]?.note ??
              "Terra estimate built from published fees, observed enrolment and segment margin benchmarks."}
          </p>
          <DemoNotice className="mt-2" />
        </PanelBody>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Revenue and EBITDA" />
          <PanelBody>
            <RevenueChart
              data={years.map((y) => ({
                year: `FY${y.year}`,
                revenue: y.revenue ?? 0,
                ebitda: y.ebitda ?? 0,
              }))}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Rent-adjusted view" meta="What a buyer of the OpCo alone would see" />
          <PanelBody className="space-y-3">
            {scored.marketRent > 0 ? (
              <>
                <Row label="Reported EBITDA (no rent charged)" value={money(scored.ebitda)} />
                <Row label="Estimated market rent" value={`(${money(scored.marketRent)})`} />
                <Row
                  label="EBITDA after rent"
                  value={money((scored.ebitda ?? 0) - scored.marketRent)}
                  emphasis
                />
                <p className="pt-1 text-[11px] leading-relaxed text-stone">
                  The campus is owned, so no rent passes through the profit and loss today. Any buyer
                  of the operating company alone has to charge a market rent against it — which is
                  why the OpCo and the freehold are valued separately.
                </p>
              </>
            ) : (
              <>
                <Row label="Rent already charged" value={money(years[years.length - 1]?.rent ?? 0)} />
                <p className="pt-1 text-[11px] leading-relaxed text-stone">
                  The campus is leased, so reported EBITDA is already after rent. There is no
                  freehold to separate.
                </p>
              </>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${emphasis ? "border-t border-rule pt-2" : ""}`}
    >
      <span className={`text-[12px] ${emphasis ? "text-ink" : "text-graphite"}`}>{label}</span>
      <span className={`num text-[12.5px] ${emphasis ? "text-ink" : "text-graphite"}`}>{value}</span>
    </div>
  );
}
