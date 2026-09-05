import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Presentation, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { loadInstitutionProfile, loadEvidence, relevantComparables } from "@/server/institution";
import { PageHeader } from "@/components/shell/page-header";
import { EntityTabs } from "@/components/atlas/entity-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreMark } from "@/components/ui/score";
import { AccessChip } from "@/components/data/access-chip";
import { DemoNotice } from "@/components/ui/provenance";
import { moneyRange } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { OverviewTab } from "@/components/atlas/tabs/overview";
import { FinancialsTab } from "@/components/atlas/tabs/financials";
import { PropertyTab } from "@/components/atlas/tabs/property";
import { OwnershipTab } from "@/components/atlas/tabs/ownership";
import { RelationshipsTab } from "@/components/atlas/tabs/relationships";
import { SignalsTab } from "@/components/atlas/tabs/signals";
import { MatchesTab } from "@/components/atlas/tabs/matches";
import { TransactionsTab } from "@/components/atlas/tabs/transactions";
import { SourcesTab } from "@/components/atlas/tabs/sources";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await loadInstitutionProfile(slug);
  return { title: profile?.record.name ?? "Institution" };
}

export default async function InstitutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const { tab = "overview" } = await searchParams;

  const profile = await loadInstitutionProfile(slug);
  if (!profile) notFound();

  const [evidence, comparables] = await Promise.all([
    loadEvidence(profile.scored.id),
    relevantComparables(profile.scored),
  ]);
  const evidenceMap = new Map(evidence.map((e) => [e.field, e]));

  const { scored, record } = profile;
  const basePath = `/atlas/${slug}`;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "financials", label: "Financials", count: record.financials.length },
    { key: "property", label: "Property" },
    { key: "ownership", label: "Ownership", count: record.ownershipStakes.length },
    { key: "relationships", label: "Relationships", count: record.relationships.length },
    { key: "signals", label: "Signals", count: record.signals.length },
    { key: "matches", label: "Matches", count: profile.matches.opco.length + profile.matches.propco.length },
    { key: "transactions", label: "Transactions", count: comparables.length },
    { key: "sources", label: "Sources", count: evidence.length },
  ];

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Atlas", href: "/atlas" },
          { label: record.name },
        ]}
        title={record.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {[record.city, record.country].filter(Boolean).join(", ")}
            </span>
            <span className="text-stone-light">·</span>
            <span>{humanise(record.type)}</span>
            {record.curriculum.length > 0 ? (
              <>
                <span className="text-stone-light">·</span>
                <span>{record.curriculum.join(" · ")}</span>
              </>
            ) : null}
            <span className="text-stone-light">·</span>
            <span>{humanise(record.ownershipType)}-owned</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}/memo`}>
                <FileText /> Memo
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}/ic`}>
                <Presentation /> IC view
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`${basePath}/opportunity`}>
                <Sparkles /> Find opportunity
              </Link>
            </Button>
          </>
        }
      />

      {/* ── Entity strip ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-rule-soft bg-paper px-6 py-3 md:px-8">
        <div className="flex items-center gap-2.5">
          <ScoreMark score={scored.displayScore} size="md" overridden={scored.overridden} />
          <span className="eyebrow max-w-[70px] leading-tight">Terra opportunity score</span>
        </div>
        <Item label="Estimated EV" value={moneyRange(scored.enterpriseValueLow, scored.enterpriseValueHigh)} />
        <Item
          label="Property"
          value={
            scored.propertyValueHigh
              ? moneyRange(scored.propertyValueLow, scored.propertyValueHigh)
              : humanise(record.tenure)
          }
        />
        <Item label="Students" value={`${scored.students ?? "—"} / ${scored.capacity ?? "—"}`} />
        <div>
          <div className="eyebrow mb-1">Relationship</div>
          <AccessChip tier={scored.accessTier} />
        </div>
        {scored.strongMatchCount > 0 ? (
          <div>
            <div className="eyebrow mb-1">Buyer demand</div>
            <Badge tone="forest" mono>
              {scored.strongMatchCount} strong · best {scored.bestMatchScore}
            </Badge>
          </div>
        ) : null}
        {record.opportunities[0] ? (
          <div>
            <div className="eyebrow mb-1">Origination</div>
            <Badge tone="ink" mono>{humanise(record.opportunities[0].stage)}</Badge>
          </div>
        ) : null}
      </div>

      <EntityTabs tabs={tabs} active={tab} basePath={basePath} />

      <div className="px-6 py-6 md:px-8">
        {tab === "overview" ? <OverviewTab profile={profile} evidence={evidenceMap as never} /> : null}
        {tab === "financials" ? <FinancialsTab profile={profile} /> : null}
        {tab === "property" ? <PropertyTab profile={profile} /> : null}
        {tab === "ownership" ? <OwnershipTab profile={profile} /> : null}
        {tab === "relationships" ? <RelationshipsTab profile={profile} /> : null}
        {tab === "signals" ? <SignalsTab profile={profile} /> : null}
        {tab === "matches" ? <MatchesTab profile={profile} /> : null}
        {tab === "transactions" ? (
          <TransactionsTab profile={profile} comparables={comparables} />
        ) : null}
        {tab === "sources" ? <SourcesTab evidence={evidence} /> : null}

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

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="num text-[13px] text-ink">{value}</div>
    </div>
  );
}
