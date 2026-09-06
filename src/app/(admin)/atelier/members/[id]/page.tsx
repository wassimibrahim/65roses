// /atelier/members/[id] — everything we hold about one Rose, in one place,
// because scattering it is how people end up guessing.
//
// Opening this page reads her phone and her standing, so opening it writes a
// pii.read row. Her address is not here: that lives behind the deliveries
// page, which has its own reveal and its own audit row.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";
import { computeRoseHealth } from "@/lib/rose-health";
import { WEIGHTS } from "@/lib/rose-health/weights";
import { atelierUser } from "../../guard";
import { addMemberNote, adjustRoseHealth, approveWake } from "../actions";

const day = (d: Date | null) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "—";

const stamp = (d: Date) => `${day(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await atelierUser();
  const { id } = await params;
  const t = copy.atelier.members;

  const member = await prisma.memberProfile.findUnique({
    where: { id },
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      instagramHandle: true,
      phone: true,
      dateOfBirth: true,
      city: true,
      area: true,
      status: true,
      foundingRose: true,
      roseHealth: true,
      roseHealthAt: true,
      wakeRequestedAt: true,
      communityStatus: true,
      eventsInvited: true,
      eventsAttended: true,
      eventsNoShow: true,
      lastAttendanceAt: true,
      user: { select: { email: true, role: true } },
      roseCredential: {
        select: {
          serial: true,
          engravedNumber: true,
          qrToken: true,
          nfcUid: true,
          status: true,
          issuedAt: true,
          replacementReason: true,
          replacementApprovedBy: true,
        },
      },
      roseDeliveries: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, courier: true, failureReason: true, updatedAt: true },
      },
      invitations: {
        orderBy: { event: { startsAt: "desc" } },
        select: {
          id: true,
          status: true,
          event: { select: { index: true, name: true, startsAt: true } },
          rsvp: { select: { response: true, outcome: true } },
        },
      },
      stemGuests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          paymentStatus: true,
          outcome: true,
          event: { select: { index: true, name: true } },
          flags: { select: { id: true, reason: true, createdAt: true } },
        },
      },
      checkIns: {
        orderBy: { enteredAt: "desc" },
        select: {
          id: true,
          enteredAt: true,
          verifyMethod: true,
          overrideReason: true,
          event: { select: { index: true, name: true } },
        },
      },
      notes: { orderBy: { createdAt: "desc" }, select: { id: true, body: true, createdAt: true } },
    },
  });

  if (!member) notFound();

  await audit(prisma, {
    action: "pii.read",
    entityType: "MemberProfile",
    entityId: member.id,
    actorId: admin.id,
    after: { fields: ["phone", "email", "dateOfBirth", "roseHealth"] },
  });

  const trail = await prisma.auditLog.findMany({
    where: { entityId: member.id, NOT: { action: "pii.read" } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, createdAt: true, before: true, after: true },
  });

  // the same computation her standing came from, shown as its parts
  const outcomes = member.invitations
    .filter((i) => i.rsvp)
    .map((i) => ({ outcome: i.rsvp!.outcome, at: i.event.startsAt }));
  const computed = computeRoseHealth({ outcomes, currentStatus: member.status });
  const tally = outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.outcome] = (acc[o.outcome] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8 px-6 py-5" style={{ fontSize: "0.8rem" }}>
      <div className="flex items-baseline gap-6">
        <span style={{ letterSpacing: "0.3em", color: "var(--gold)" }}>{member.memberNumber}</span>
        <span style={{ fontSize: "1rem" }}>
          {member.firstName} {member.lastName}
        </span>
        <Link href="/atelier/members" className="atelier-label">
          {t.back}
        </Link>
      </div>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">{t.identity}</span>
        <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5">
          <dt className="atelier-label">{t.handle}</dt>
          <dd>
            <a
              href={`https://instagram.com/${member.instagramHandle}`}
              target="_blank"
              rel="noreferrer"
            >
              @{member.instagramHandle}
            </a>
          </dd>
          <dt className="atelier-label">{copy.enter.email}</dt>
          <dd>{member.user.email}</dd>
          <dt className="atelier-label">{copy.apply.fields.mobile}</dt>
          <dd>{member.phone}</dd>
          <dt className="atelier-label">{copy.apply.fields.dateOfBirth}</dt>
          <dd>{day(member.dateOfBirth)}</dd>
          <dt className="atelier-label">{t.city}</dt>
          <dd>{[member.area, member.city].filter(Boolean).join(", ")}</dd>
          <dt className="atelier-label">{t.status}</dt>
          <dd>
            {member.status}
            {member.foundingRose ? ` · ${t.founding}` : ""}
          </dd>
          <dt className="atelier-label">{t.community}</dt>
          <dd>{member.communityStatus}</dd>
        </dl>
        {member.wakeRequestedAt ? (
          <form action={approveWake} className="mt-2">
            <input type="hidden" name="id" value={member.id} />
            <button type="submit" className="atelier-action">
              {t.wake}
            </button>
          </form>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">{t.credential}</span>
        {member.roseCredential ? (
          <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5">
            <dt className="atelier-label">{t.serial}</dt>
            <dd>{member.roseCredential.serial}</dd>
            <dt className="atelier-label">{t.qr}</dt>
            <dd>{member.roseCredential.qrToken}</dd>
            <dt className="atelier-label">{t.nfc}</dt>
            <dd>{member.roseCredential.nfcUid ?? "—"}</dd>
            <dt className="atelier-label">{t.status}</dt>
            <dd>
              {member.roseCredential.status} · {day(member.roseCredential.issuedAt)}
            </dd>
            <dt className="atelier-label">{t.replacement}</dt>
            <dd>{member.roseCredential.replacementReason ?? "—"}</dd>
          </dl>
        ) : (
          <span style={{ color: "var(--chalk-dim)" }}>{t.empty}</span>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">
          {t.health} · {member.roseHealth} · {t.breakdown}
        </span>
        <div style={{ color: "var(--chalk-dim)" }}>
          {Object.entries(tally)
            .map(
              ([outcome, count]) =>
                `${outcome} ×${count} (${(WEIGHTS[outcome as keyof typeof WEIGHTS] ?? 0) * count})`,
            )
            .join(" · ") || t.empty}
        </div>
        <div style={{ color: "var(--chalk-dim)" }}>
          {computed.score} · {computed.status} · {day(member.roseHealthAt)}
        </div>
        <form action={adjustRoseHealth} className="mt-2 flex items-end gap-2">
          <input type="hidden" name="id" value={member.id} />
          <input
            className="atelier-input w-16"
            name="delta"
            inputMode="numeric"
            aria-label={t.adjust}
            required
          />
          <input
            className="atelier-input flex-1"
            name="reason"
            aria-label={t.adjustReason}
            required
          />
          <button type="submit" className="atelier-action">
            {t.adjust}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">{t.invitations}</span>
        <table className="atelier-table">
          <tbody>
            {member.invitations.map((i) => (
              <tr key={i.id}>
                <td>{i.event.index}</td>
                <td>{i.event.name}</td>
                <td>{day(i.event.startsAt)}</td>
                <td>{i.rsvp?.response ?? i.status}</td>
                <td>{i.rsvp?.outcome ?? "—"}</td>
              </tr>
            ))}
            {member.invitations.length === 0 ? (
              <tr>
                <td style={{ color: "var(--chalk-dim)" }}>{t.empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">{t.stems}</span>
        <table className="atelier-table">
          <tbody>
            {member.stemGuests.map((s) => (
              <tr key={s.id}>
                <td>{s.event.index}</td>
                <td>
                  {s.firstName} {s.lastName}
                </td>
                <td>{s.paymentStatus}</td>
                <td>{s.outcome}</td>
                <td className="atelier-label">
                  {s.flags.map((f) => f.reason).join(" · ") || "—"}
                </td>
              </tr>
            ))}
            {member.stemGuests.length === 0 ? (
              <tr>
                <td style={{ color: "var(--chalk-dim)" }}>{t.empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">{t.checkIns}</span>
        {member.checkIns.map((c) => (
          <div key={c.id} style={{ color: "var(--chalk-dim)" }}>
            {stamp(c.enteredAt)} — {c.event.name} · {c.verifyMethod}
            {c.overrideReason ? ` · ${c.overrideReason}` : ""}
          </div>
        ))}
        {member.checkIns.length === 0 ? (
          <span style={{ color: "var(--chalk-dim)" }}>{t.empty}</span>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">{t.deliveries}</span>
        {member.roseDeliveries.map((d) => (
          <div key={d.id} style={{ color: "var(--chalk-dim)" }}>
            {day(d.updatedAt)} — {d.status}
            {d.courier ? ` · ${d.courier}` : ""}
            {d.failureReason ? ` · ${d.failureReason}` : ""}
          </div>
        ))}
        {member.roseDeliveries.length === 0 ? (
          <span style={{ color: "var(--chalk-dim)" }}>{t.empty}</span>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <span className="atelier-label">{copy.atelier.applications.notes}</span>
        <form action={addMemberNote} className="flex gap-2">
          <input type="hidden" name="id" value={member.id} />
          <input className="atelier-input flex-1" name="body" maxLength={2000} required />
          <button type="submit" className="atelier-action">
            {copy.atelier.applications.addNote}
          </button>
        </form>
        {member.notes.map((n) => (
          <div key={n.id} style={{ color: "var(--chalk-dim)" }}>
            {day(n.createdAt)} — {n.body}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1.5">
        <span className="atelier-label">{t.trail}</span>
        {trail.map((row) => (
          <div key={row.id} style={{ color: "var(--chalk-dim)" }}>
            {stamp(row.createdAt)} — {row.action}
            {row.after ? ` · ${JSON.stringify(row.after)}` : ""}
          </div>
        ))}
        {trail.length === 0 ? (
          <span style={{ color: "var(--chalk-dim)" }}>{t.empty}</span>
        ) : null}
      </section>
    </div>
  );
}
