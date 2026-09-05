import { requireUser } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";
import { humanise } from "@/lib/utils";

export async function GET() {
  const user = await requireUser();
  const comps = await db.transactionComparable.findMany({
    orderBy: { date: "desc" },
    include: { source: { select: { name: true } } },
  });

  await recordAudit({
    userId: user.id,
    action: "EXPORT",
    entityType: "TransactionComparable",
    entityId: "comparables-export",
    context: `${comps.length} transactions`,
  });

  const csv = toCsv(
    comps.map((c) => ({
      Target: c.target,
      Buyer: c.buyer,
      Country: c.country,
      Date: c.date,
      Segment: humanise(c.segment),
      "Enterprise value": c.ev,
      Revenue: c.revenue,
      EBITDA: c.ebitda,
      "EV / Revenue": c.evRevenue,
      "EV / EBITDA": c.evEbitda,
      "Real estate included": c.realEstateIncluded ? "Yes" : "No",
      Source: c.source?.name,
      Notes: c.notes,
      Basis: "Illustrative demo data",
    })),
  );

  return csvResponse(csv, `terra-precedent-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
}
