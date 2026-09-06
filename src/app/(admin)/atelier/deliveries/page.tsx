// /atelier/deliveries — where each Rose is on her way to.
//
// The address is masked in the list. Revealing one is a deliberate click that
// writes a pii.read row naming the person who looked. There is no way to see
// an address here by accident.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";
import { atelierUser } from "../guard";
import { advanceDeliveries, failDelivery, replaceRose, setCourier } from "./actions";

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ reveal?: string }>;
}) {
  const admin = await atelierUser();
  const params = await searchParams;
  const t = copy.atelier.deliveries;

  const deliveries = await prisma.roseDelivery.findMany({
    where: { status: { notIn: ["DELIVERED"] } },
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      courier: true,
      trackingRef: true,
      failureReason: true,
      memberId: true,
      member: {
        select: {
          memberNumber: true,
          firstName: true,
          lastName: true,
          deliveryAddress: { select: { area: true, city: true } },
        },
      },
    },
  });

  // one address, revealed on purpose, logged as read
  const revealed = params.reveal
    ? await prisma.roseDelivery.findUnique({
        where: { id: params.reveal },
        select: {
          id: true,
          memberId: true,
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
      })
    : null;

  if (revealed) {
    await audit(prisma, {
      action: "pii.read",
      entityType: "DeliveryAddress",
      entityId: revealed.memberId,
      actorId: admin.id,
      after: { fields: ["addressLine", "phone", "notes"], via: "deliveries" },
    });
  }

  return (
    <div className="px-6 py-5">
      <form action={advanceDeliveries} className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button type="submit" className="atelier-action">
            {t.advance}
          </button>
          <Link href="/atelier/deliveries/manifest" className="atelier-action">
            {t.manifest}
          </Link>
        </div>

        <table className="atelier-table">
          <thead>
            <tr>
              <th />
              <th>{t.columns.number}</th>
              <th>{t.columns.member}</th>
              <th>{t.columns.area}</th>
              <th>{t.columns.status}</th>
              <th>{t.columns.courier}</th>
              <th>{t.columns.updated}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td>
                  <input type="checkbox" name="ids" value={d.id} aria-label={t.selected} />
                </td>
                <td style={{ letterSpacing: "0.25em" }}>{d.member.memberNumber}</td>
                <td>
                  {d.member.firstName} {d.member.lastName}
                </td>
                <td>
                  {d.member.deliveryAddress
                    ? `${d.member.deliveryAddress.area}, ${d.member.deliveryAddress.city}`
                    : "—"}
                </td>
                <td>
                  {d.status}
                  {d.failureReason ? ` · ${d.failureReason}` : ""}
                </td>
                <td className="atelier-label">
                  {[d.courier, d.trackingRef].filter(Boolean).join(" · ") || "—"}
                </td>
                <td>{fmt(d.updatedAt)}</td>
                <td>
                  <Link href={`/atelier/deliveries?reveal=${d.id}`} className="atelier-label">
                    {t.reveal}
                  </Link>
                </td>
              </tr>
            ))}
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--chalk-dim)" }}>
                  {t.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </form>

      {revealed?.member.deliveryAddress ? (
        <aside
          className="mt-8 flex flex-col gap-3 p-5"
          style={{ border: "1px solid rgba(232, 226, 214, 0.08)", fontSize: "0.8rem" }}
        >
          <div className="flex items-baseline justify-between">
            <span style={{ letterSpacing: "0.25em" }}>{revealed.member.memberNumber}</span>
            <Link href="/atelier/deliveries" style={{ color: "var(--chalk-dim)" }}>
              ×
            </Link>
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5">
            <dt className="atelier-label">{copy.delivery.recipient}</dt>
            <dd>{revealed.member.deliveryAddress.recipientName}</dd>
            <dt className="atelier-label">{copy.apply.fields.mobile}</dt>
            <dd>{revealed.member.deliveryAddress.phone}</dd>
            <dt className="atelier-label">{copy.delivery.address}</dt>
            <dd>
              {revealed.member.deliveryAddress.addressLine},{" "}
              {revealed.member.deliveryAddress.area}, {revealed.member.deliveryAddress.city}
            </dd>
            <dt className="atelier-label">{copy.atelier.applications.notes}</dt>
            <dd>{revealed.member.deliveryAddress.notes ?? "—"}</dd>
          </dl>

          <div className="mt-3 flex flex-wrap items-end gap-4">
            <form action={setCourier} className="flex items-end gap-2">
              <input type="hidden" name="id" value={revealed.id} />
              <input className="atelier-input" name="courier" aria-label={t.columns.courier} />
              <input className="atelier-input" name="trackingRef" aria-label={t.courierRef} />
              <button type="submit" className="atelier-action">
                {t.save}
              </button>
            </form>
            <form action={failDelivery} className="flex items-end gap-2">
              <input type="hidden" name="id" value={revealed.id} />
              <input className="atelier-input" name="reason" aria-label={t.reason} required />
              <button type="submit" className="atelier-action">
                {t.fail}
              </button>
            </form>
          </div>
        </aside>
      ) : null}

      {/* Replacement is never self-serve and never an admin's own decision.
          Her number does not change; the old object is not asked for. */}
      {admin.role === "OWNER" ? (
        <section className="mt-10 flex flex-col gap-3">
          <span className="atelier-label">{t.replace}</span>
          <form action={replaceRose} className="flex flex-wrap items-end gap-2">
            <input
              className="atelier-input w-28"
              name="memberId"
              aria-label={t.columns.member}
              required
            />
            <select className="atelier-input" name="reason" aria-label={t.reason} defaultValue="">
              {["THEFT", "DAMAGE", "SAFETY"].map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
            <input
              className="atelier-input flex-1"
              name="note"
              aria-label={copy.atelier.applications.notes}
              required
            />
            <button type="submit" className="atelier-action">
              {t.approve}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
