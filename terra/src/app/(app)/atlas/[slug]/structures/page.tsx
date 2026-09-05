import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { analyseOpportunity } from "@/server/thesis";
import { PageHeader } from "@/components/shell/page-header";
import { StructureLab } from "@/components/underwriting/structure-lab";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/provenance";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  return { title: analysis ? `Structures · ${analysis.profile.record.name}` : "Structures" };
}

export default async function StructuresPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  if (!analysis) notFound();

  const { profile, assumptions, objectives } = analysis;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Atlas", href: "/atlas" },
          { label: profile.record.name, href: `/atlas/${slug}` },
          { label: "Structures" },
        ]}
        title="Transaction structure lab"
        subtitle={`${profile.record.name} · the same asset, expressed eight different ways`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/atlas/${slug}/opportunity`}>Thesis</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/underwriting/${slug}`}>Underwriting</Link>
            </Button>
          </>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <StructureLab
          institutionName={profile.record.name}
          initial={assumptions}
          objectives={objectives}
          hasFounderProfile={Boolean(profile.record.founderProfile)}
        />

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
