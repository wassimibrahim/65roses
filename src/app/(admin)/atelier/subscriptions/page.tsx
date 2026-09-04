// /atelier/subscriptions — the lapsed ones, for a person to look at.
//
// This page exists because the system deliberately does nothing about a failed
// payment. It does not pause her, it does not stop her invitations, and it
// never touches her Rose. It puts her name here and waits for someone to
// decide, which is the only place that decision belongs.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { memberSubscriptionLine } from "@/lib/subscription";
import { atelierUser } from "../guard";

const day = (d: Date | null) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "—";

export default async function SubscriptionsPage() {
  await atelierUser();
  const t = copy.atelier.members;

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { currentPeriodEnd: "asc" },
    take: 500,
    select: {
      id: true,
      memberId: true,
      provider: true,
      status: true,
      currentPeriodEnd: true,
      cancelAt: true,
    },
  });

  // Subscription holds a memberId but no relation, so the Roses are fetched
  // alongside and matched here
  const members = await prisma.memberProfile.findMany({
    where: { id: { in: subscriptions.map((s) => s.memberId) } },
    select: { id: true, memberNumber: true, firstName: true, lastName: true, status: true },
  });
  const byId = new Map(members.map((m) => [m.id, m]));

  const rows = subscriptions
    .map((sub) => ({
      ...sub,
      state: memberSubscriptionLine(sub),
      member: byId.get(sub.memberId),
    }))
    .filter((row) => row.state === "LAPSED" || row.state === "CANCELLING");

  return (
    <div className="px-6 py-5">
      <table className="atelier-table">
        <thead>
          <tr>
            <th>{t.number}</th>
            <th>{t.name}</th>
            <th>{t.status}</th>
            <th>{copy.atelier.messages.status}</th>
            <th>{copy.atelier.deliveries.columns.updated}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ letterSpacing: "0.25em" }}>{row.member?.memberNumber ?? "—"}</td>
              <td>
                {row.member?.firstName} {row.member?.lastName}
              </td>
              {/* her standing, untouched by any of this */}
              <td>{row.member?.status ?? "—"}</td>
              <td>
                {row.state} · {row.provider}
              </td>
              <td>{day(row.currentPeriodEnd)}</td>
              <td>
                {row.member ? (
                  <Link href={`/atelier/members/${row.member.id}`} className="atelier-label">
                    {t.detail}
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ color: "var(--chalk-dim)" }}>
                {t.empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
