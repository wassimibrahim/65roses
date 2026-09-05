import { requireRole } from "@/lib/rbac";
import { PageHeader } from "@/components/shell/page-header";
import { CsvImport } from "@/components/settings/csv-import";
import { DemoNotice } from "@/components/ui/provenance";

export const metadata = { title: "CSV import" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("ASSOCIATE");

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Settings", href: "/settings" },
          { label: "Import" },
        ]}
        title="CSV import"
        subtitle="Map columns, check what Terra read, then stage. Nothing is written until the mapping is right."
      />

      <div className="px-6 py-6 md:px-8">
        <CsvImport />

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
