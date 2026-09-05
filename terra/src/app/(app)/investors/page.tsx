import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { loadInvestors, investorSummary } from "@/server/investors";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { StrengthMarks } from "@/components/ui/score";
import { DemoNotice } from "@/components/ui/provenance";
import { money, ageLabel } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const metadata = { title: "Investors" };
export const dynamic = "force-dynamic";

const CAPITAL_TYPES = new Set([
  "PRIVATE_EQUITY", "INFRASTRUCTURE_FUND", "FAMILY_OFFICE", "EDUCATION_OPERATOR",
  "REAL_ESTATE_INVESTOR", "REIT", "PENSION_FUND", "SOVEREIGN_WEALTH_FUND",
  "INSTITUTIONAL_INVESTOR", "FAMILY_HOLDING", "FOUNDATION",
]);

export default async function InvestorsPage() {
  await requireUser();
  const rows = await loadInvestors();
  const capital = rows.filter((r) => CAPITAL_TYPES.has(r.type));
  const advisers = rows.filter((r) => !CAPITAL_TYPES.has(r.type));
  const totals = investorSummary(capital);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Investors" }]}
        title="Investors & operators"
        subtitle={
          <>
            {totals.withActive} counterparties with live mandates · {totals.activeMandates} active
            mandates · {money(totals.aum)} of stated capital
          </>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <section className="mb-6 grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Counterparties" value={String(totals.count)} />
          <Stat label="Active mandates" value={String(totals.activeMandates)} />
          <Stat label="Stated capital" value={money(totals.aum)} />
          <Stat label="Warm or trusted" value={String(totals.warmOrBetter)} />
          <Stat
            label="Mandates unconfirmed 6m+"
            value={String(totals.staleMandates)}
            tone={totals.staleMandates > 0 ? "burgundy" : undefined}
          />
        </section>

        <Panel>
          <PanelHeader title="Capital and operators" meta={`${capital.length}`} />
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Type</th>
                  <th>HQ</th>
                  <th className="text-right">Capital</th>
                  <th>Active in</th>
                  <th className="text-right">Mandates</th>
                  <th className="text-right">Strong matches</th>
                  <th>Terra relationship</th>
                  <th>Mandate confirmed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {capital.map((row) => {
                  const stale =
                    row.activeMandates > 0 &&
                    (!row.lastConfirmed ||
                      Date.now() - row.lastConfirmed.getTime() > 180 * 86_400_000);
                  return (
                    <tr key={row.id}>
                      <td className="max-w-[230px]">
                        <Link
                          href={`/investors/${row.slug}`}
                          className="text-[12.5px] text-ink hover:underline"
                        >
                          {row.name}
                        </Link>
                        {row.isPublicExample ? (
                          <Badge tone="quiet" mono className="ml-1.5">
                            Public example
                          </Badge>
                        ) : null}
                      </td>
                      <td className="text-[11.5px] text-graphite">{humanise(row.type)}</td>
                      <td className="text-[11.5px] text-graphite">{row.hq ?? "—"}</td>
                      <td className="num text-right text-[11.5px]">
                        {row.aum ? money(row.aum) : "—"}
                      </td>
                      <td className="max-w-[180px] truncate text-[11px] text-stone">
                        {row.countriesActive.join(", ") || "—"}
                      </td>
                      <td className="num text-right text-[11.5px]">
                        {row.activeMandates > 0 ? (
                          <span className="text-forest">{row.activeMandates}</span>
                        ) : (
                          <span className="text-stone-light">0</span>
                        )}
                        <span className="text-stone-light"> / {row.totalMandates}</span>
                      </td>
                      <td className="num text-right text-[11.5px]">
                        {row.strongMatches > 0 ? (
                          <>
                            {row.strongMatches}
                            <span className="text-stone-light"> · {row.bestMatch}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td><StrengthMarks strength={row.relationship} /></td>
                      <td className={`text-[11px] ${stale ? "text-amber" : "text-stone"}`}>
                        {row.activeMandates > 0 ? ageLabel(row.lastConfirmed) : "—"}
                      </td>
                      <td className="text-right">
                        {row.activeMandates > 0 ? (
                          <Link
                            href={`/investors/${row.slug}?tab=targets`}
                            className="whitespace-nowrap text-[11px] text-stone hover:text-ink"
                          >
                            Find targets →
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="mt-6">
          <PanelHeader title="Advisers and intermediaries" meta={`${advisers.length}`} />
          <table className="grid-table">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Type</th>
                <th>HQ</th>
                <th>Terra relationship</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {advisers.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link
                      href={`/investors/${row.slug}`}
                      className="text-[12.5px] text-ink hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="text-[11.5px] text-graphite">{humanise(row.type)}</td>
                  <td className="text-[11.5px] text-graphite">{row.hq ?? "—"}</td>
                  <td><StrengthMarks strength={row.relationship} /></td>
                  <td className="max-w-md text-[11px] text-stone">{row.summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <footer className="mt-10 flex items-center justify-between border-t border-rule-soft pt-4">
          <DemoNotice />
          <span className="text-[10.5px] text-stone">
            Named operators are public market examples. Mandates shown against them are illustrative.
          </span>
        </footer>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "burgundy" }) {
  return (
    <div className="bg-ivory px-3.5 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={`num mt-0.5 text-[14px] ${tone === "burgundy" ? "text-burgundy" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
