import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { underwritingSetup } from "@/server/underwriting";
import { PageHeader } from "@/components/shell/page-header";
import { UnderwritingModel } from "@/components/underwriting/model";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/provenance";
import { humanise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const setup = await underwritingSetup(slug);
  return { title: setup ? `Underwriting · ${setup.record.name}` : "Underwriting" };
}

export default async function UnderwritingModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const setup = await underwritingSetup(slug);
  if (!setup) notFound();

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Underwriting", href: "/underwriting" },
          { label: setup.record.name },
        ]}
        title={setup.record.name}
        subtitle={
          <>
            {[setup.record.city, humanise(setup.record.type)].filter(Boolean).join(" · ")} ·{" "}
            {setup.stats.count} precedent transactions in the comparable set
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/atlas/${slug}`}>Profile</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/atlas/${slug}/structures`}>Structure lab</Link>
            </Button>
          </>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <UnderwritingModel
          institutionName={setup.record.name}
          initial={setup.assumptions}
          marketRent={setup.marketRent}
          propertyValue={setup.propertyValue}
          netDebt={setup.netDebt}
          compMultiples={setup.stats.evEbitda}
          history={setup.history}
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
