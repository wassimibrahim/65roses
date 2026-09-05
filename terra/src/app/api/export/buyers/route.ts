import { type NextRequest } from "next/server";
import { requireUser, canSeeConfidential } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";
import { humanise } from "@/lib/utils";

/** Buyer universe for one deal, as the client would want to see it. */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const slug = request.nextUrl.searchParams.get("deal");
  if (!slug) return new Response("Missing deal", { status: 400 });

  const deal = await db.deal.findFirst({
    where: { slug, deletedAt: null },
    include: {
      buyerUniverse: {
        include: { organisation: { select: { name: true, type: true, hq: true, countriesActive: true } } },
        orderBy: [{ stage: "asc" }, { sortIndex: "asc" }],
      },
    },
  });
  if (!deal) return new Response("Not found", { status: 404 });
  if (deal.restricted && !canSeeConfidential(user.role)) {
    return new Response("Restricted", { status: 403 });
  }

  await recordAudit({
    userId: user.id,
    action: "EXPORT",
    entityType: "Deal",
    entityId: deal.id,
    context: `Buyer universe · ${deal.buyerUniverse.length} rows`,
  });

  const csv = toCsv(
    deal.buyerUniverse.map((b) => ({
      Buyer: b.organisation.name,
      Category: humanise(b.organisation.type),
      Headquarters: b.organisation.hq,
      "Active in": b.organisation.countriesActive.join("; "),
      "Strategic rationale": b.strategicRationale,
      "Financial capability": b.financialCapability,
      "Terra relationship (1-5)": b.relationshipStrength,
      "Fit score": b.fitScore,
      Status: humanise(b.stage),
      "NDA signed": b.ndaSignedAt,
      "Teaser sent": b.teaserSentAt,
      "CIM sent": b.cimSentAt,
      IOI: b.ioiValue,
      LOI: b.loiValue,
      Notes: b.notes,
    })),
  );

  return csvResponse(csv, `${deal.slug}-buyer-universe.csv`);
}
