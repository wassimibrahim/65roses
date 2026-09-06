// /atelier/events/[id] — one night: the live numbers, the preview, the invitations
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { invitationMessages } from "@/content/messages";
import { atelierUser } from "../../guard";
import { refundStem, sendInvitations } from "../actions";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="atelier-label">{label}</span>
      <span style={{ fontSize: "1.3rem", letterSpacing: "0.1em" }}>{value}</span>
    </div>
  );
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mstatus?: string; mcity?: string; founding?: string }>;
}) {
  await atelierUser();
  const { id } = await params;
  const filters = await searchParams;

  const event = await prisma.event.findUnique({ where: { id, deletedAt: null } });
  if (!event) notFound();

  const [invited, confirmed, declined, stemsRegistered, stemsPaid, rosesInside, stemsInside] =
    await Promise.all([
      prisma.eventInvitation.count({ where: { eventId: id } }),
      prisma.rsvp.count({ where: { eventId: id, response: "CONFIRMED" } }),
      prisma.rsvp.count({ where: { eventId: id, response: "DECLINED" } }),
      prisma.stemGuest.count({ where: { eventId: id, deletedAt: null } }),
      prisma.stemGuest.count({ where: { eventId: id, deletedAt: null, paymentStatus: "PAID" } }),
      prisma.checkIn.count({ where: { eventId: id, subject: "ROSE", exitedAt: null } }),
      prisma.checkIn.count({ where: { eventId: id, subject: "STEM", exitedAt: null } }),
    ]);

  const alreadyInvited = await prisma.eventInvitation.findMany({
    where: { eventId: id },
    select: { memberId: true },
  });
  const invitedSet = new Set(alreadyInvited.map((i) => i.memberId));

  const members = await prisma.memberProfile.findMany({
    where: {
      deletedAt: null,
      ...(filters.mstatus ? { status: filters.mstatus as never } : {}),
      ...(filters.mcity ? { city: filters.mcity as never } : {}),
      ...(filters.founding ? { foundingRose: true } : {}),
    },
    orderBy: { memberNumber: "asc" },
    take: 500,
    select: { id: true, memberNumber: true, firstName: true, status: true, city: true },
  });

  const stems = await prisma.stemGuest.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      paymentStatus: true,
      deletedAt: true,
      hostMember: { select: { memberNumber: true } },
      credential: { select: { status: true } },
    },
  });

  const preview = invitationMessages(event, process.env.NEXT_PUBLIC_APP_URL ?? "");
  const t = copy.atelier.events;

  return (
    <div className="flex flex-col gap-8 px-6 py-5">
      <header className="flex items-baseline gap-6">
        <span style={{ letterSpacing: "0.3em" }}>{event.index}</span>
        <span style={{ fontSize: "1.2rem", letterSpacing: "0.15em" }}>{event.name}</span>
        <span className="atelier-label">
          {event.city} · {event.startsAt.toISOString().slice(0, 10)} · {event.status}
        </span>
      </header>

      <section className="grid grid-cols-3 gap-6 lg:grid-cols-9">
        <Stat label={t.stats.invited} value={invited} />
        <Stat label={t.stats.confirmed} value={confirmed} />
        <Stat label={t.stats.declined} value={declined} />
        <Stat label={t.stats.noResponse} value={invited - confirmed - declined} />
        <Stat label={t.stats.stemsRegistered} value={stemsRegistered} />
        <Stat label={t.stats.stemsPaid} value={stemsPaid} />
        <Stat label={copy.door.rosesInside} value={rosesInside} />
        <Stat label={copy.door.stemsInside} value={stemsInside} />
        <Stat label={copy.door.total} value={rosesInside + stemsInside} />
      </section>

      <section className="flex flex-col gap-3">
        <span className="atelier-label">{t.invite.preview}</span>
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--chalk-dim)",
            whiteSpace: "pre-wrap",
            borderLeft: "1px solid rgba(232,226,214,0.15)",
            paddingLeft: "1rem",
          }}
        >
          {preview.sms}
          {"\n\n"}
          {preview.email.subject}
          {"\n"}
          {preview.email.text}
        </pre>
      </section>

      <section className="flex flex-col gap-3">
        <span className="atelier-label">{t.stemsTable.title}</span>
        <table className="atelier-table" style={{ maxWidth: "42rem" }}>
          <tbody>
            {stems.map((s) => (
              <tr key={s.id}>
                <td>{s.firstName}</td>
                <td className="atelier-label">
                  {t.stemsTable.host} {s.hostMember.memberNumber}
                </td>
                <td>{s.paymentStatus}</td>
                <td>{s.credential?.status ?? "—"}</td>
                <td>
                  {s.paymentStatus === "PAID" ? (
                    <form action={refundStem}>
                      <input type="hidden" name="stemGuestId" value={s.id} />
                      <button type="submit" className="atelier-action">
                        {t.stemsTable.refund}
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="atelier-label">{t.invite.title}</span>
          <form className="flex items-center gap-3">
            <select className="atelier-input" name="mstatus" defaultValue={filters.mstatus ?? ""}>
              <option value="">—</option>
              {["ACTIVE", "QUIET", "AT_RISK", "PAUSED"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select className="atelier-input" name="mcity" defaultValue={filters.mcity ?? ""}>
              <option value="">—</option>
              {["BEIRUT", "MADRID"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="founding"
                value="1"
                defaultChecked={!!filters.founding}
              />
              <span className="atelier-label">{t.invite.founding}</span>
            </label>
            <button type="submit" className="atelier-action">
              {copy.atelier.applications.search}
            </button>
          </form>
        </div>

        <form action={sendInvitations} className="flex flex-col gap-3">
          <input type="hidden" name="eventId" value={event.id} />
          <table className="atelier-table" style={{ maxWidth: "42rem" }}>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td style={{ width: "2rem" }}>
                    {invitedSet.has(m.id) ? (
                      <span className="atelier-label">{t.invite.invited}</span>
                    ) : (
                      <input type="checkbox" name="memberIds" value={m.id} />
                    )}
                  </td>
                  <td>{m.memberNumber}</td>
                  <td>{m.firstName}</td>
                  <td>{m.status}</td>
                  <td>{m.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <button type="submit" className="atelier-action">
              {t.invite.send}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
