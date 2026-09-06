// The manifest — what the person carrying the boxes actually needs, one Rose
// per page. Opening it is a bulk read of every address on it, so opening it is
// itself the audited event.
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";
import { atelierUser } from "../../guard";

export const dynamic = "force-dynamic";

export default async function ManifestPage() {
  const admin = await atelierUser();
  const t = copy.atelier.deliveries;

  const rows = await prisma.roseDelivery.findMany({
    where: { status: { in: ["READY", "OUT_FOR_DELIVERY"] } },
    orderBy: { member: { memberNumber: "asc" } },
    select: {
      id: true,
      memberId: true,
      status: true,
      courier: true,
      trackingRef: true,
      member: {
        select: {
          memberNumber: true,
          deliveryAddress: {
            select: {
              recipientName: true,
              phone: true,
              city: true,
              area: true,
              addressLine: true,
              notes: true,
            },
          },
        },
      },
    },
  });

  await audit(prisma, {
    action: "pii.read",
    entityType: "RoseDelivery",
    entityId: "manifest",
    actorId: admin.id,
    after: {
      fields: ["addressLine", "phone", "notes"],
      via: "manifest",
      count: rows.length,
      members: rows.map((r) => r.member.memberNumber),
    },
  });

  return (
    <div className="manifest">
      {rows.map((row) => (
        <article key={row.id} className="manifest-page">
          <div className="manifest-number">{row.member.memberNumber}</div>
          {row.member.deliveryAddress ? (
            <>
              <div className="manifest-name">{row.member.deliveryAddress.recipientName}</div>
              <div className="manifest-line">{row.member.deliveryAddress.phone}</div>
              <div className="manifest-line">{row.member.deliveryAddress.addressLine}</div>
              <div className="manifest-line">
                {row.member.deliveryAddress.area}, {row.member.deliveryAddress.city}
              </div>
              {row.member.deliveryAddress.notes ? (
                <div className="manifest-note">{row.member.deliveryAddress.notes}</div>
              ) : null}
            </>
          ) : null}
          {row.courier || row.trackingRef ? (
            <div className="manifest-note">
              {[row.courier, row.trackingRef].filter(Boolean).join(" · ")}
            </div>
          ) : null}
        </article>
      ))}
      {rows.length === 0 ? <article className="manifest-page">{t.empty}</article> : null}
    </div>
  );
}
