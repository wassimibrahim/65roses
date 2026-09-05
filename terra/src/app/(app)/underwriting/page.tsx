import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { modelledInstitutions } from "@/server/underwriting";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ScoreMark } from "@/components/ui/score";
import { DemoNotice } from "@/components/ui/provenance";
import { money, moneyRange, percent, exact } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const metadata = { title: "Underwriting" };
export const dynamic = "force-dynamic";

export default async function UnderwritingPage() {
  await requireUser();
  const institutions = await modelledInstitutions();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Underwriting" }]}
        title="Underwriting"
        subtitle="Projections, valuation, structures and returns. Decision support during a conversation, not a replacement for the full model."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/underwriting/comparables">Precedent transactions</Link>
          </Button>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <Panel>
          <PanelHeader title="Institutions with an estimable model" meta={`${institutions.length}`} />
          <div className="max-h-[calc(100vh-260px)] overflow-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className="text-right">Score</th>
                  <th>Institution</th>
                  <th>Location</th>
                  <th className="text-right">Students</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">EBITDA</th>
                  <th className="text-right">Margin</th>
                  <th className="text-right">Market rent</th>
                  <th className="text-right">Est. EV</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {institutions.map((i) => (
                  <tr key={i.id}>
                    <td className="text-right">
                      <ScoreMark score={i.displayScore} size="sm" overridden={i.overridden} className="items-end" />
                    </td>
                    <td>
                      <Link href={`/underwriting/${i.slug}`} className="text-[12.5px] text-ink hover:underline">
                        {i.name}
                      </Link>
                      <div className="text-[10.5px] text-stone">{humanise(i.type)}</div>
                    </td>
                    <td className="text-[11.5px] text-graphite">{i.city}</td>
                    <td className="num text-right text-[11.5px]">{exact(i.students)}</td>
                    <td className="num text-right text-[11.5px]">{money(i.revenue)}</td>
                    <td className="num text-right text-[11.5px]">{money(i.ebitda)}</td>
                    <td className="num text-right text-[11.5px]">{percent(i.ebitdaMargin)}</td>
                    <td className="num text-right text-[11.5px]">
                      {i.marketRent ? money(i.marketRent) : "—"}
                    </td>
                    <td className="num text-right text-[11.5px]">
                      {moneyRange(i.enterpriseValueLow, i.enterpriseValueHigh)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/underwriting/${i.slug}`}
                        className="whitespace-nowrap text-[10.5px] text-stone hover:text-ink"
                      >
                        Model →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <footer className="mt-10 flex items-center justify-between border-t border-rule-soft pt-4">
          <DemoNotice />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone-light">
            Confidential — Terra Capital
          </span>
        </footer>
      </div>
    </>
  );
}
