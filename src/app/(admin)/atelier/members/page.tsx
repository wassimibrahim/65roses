// /atelier/members — the Roses. The wake queue sits on top because it is the
// only list here where someone is waiting for an answer.
//
// roseHealth is visible on this page and on no other. It never crosses into a
// member-facing response; the DTO is what guarantees that, not this comment.
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { atelierUser } from "../guard";
import { approveWake, dismissWake, pauseMember } from "./actions";

const fmt = (d: Date | null) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "—";

export default async function MembersPage() {
  await atelierUser();
  const t = copy.atelier.members;

  const waking = await prisma.memberProfile.findMany({
    where: { deletedAt: null, wakeRequestedAt: { not: null } },
    orderBy: { wakeRequestedAt: "asc" },
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      status: true,
      roseHealth: true,
      wakeRequestedAt: true,
      eventsNoShow: true,
    },
  });

  const members = await prisma.memberProfile.findMany({
    where: { deletedAt: null },
    orderBy: { memberNumber: "asc" },
    take: 500,
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      status: true,
      roseHealth: true,
      eventsInvited: true,
      eventsAttended: true,
      eventsNoShow: true,
      lastAttendanceAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-10 px-6 py-5">
      {waking.length > 0 ? (
        <section className="flex flex-col gap-3">
          <span className="atelier-label">{t.wakeQueue}</span>
          <table className="atelier-table">
            <thead>
              <tr>
                <th>{t.number}</th>
                <th>{t.name}</th>
                <th>{t.asked}</th>
                <th>{t.health}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {waking.map((m) => (
                <tr key={m.id}>
                  <td style={{ letterSpacing: "0.25em" }}>{m.memberNumber}</td>
                  <td>{m.firstName}</td>
                  <td>{fmt(m.wakeRequestedAt)}</td>
                  <td>
                    {m.roseHealth} · {m.eventsNoShow}
                  </td>
                  <td>
                    <div className="flex gap-3">
                      <form action={approveWake}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="atelier-action">
                          {t.wake}
                        </button>
                      </form>
                      <form action={dismissWake}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="atelier-action">
                          {copy.atelier.referrals.decline}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <table className="atelier-table">
        <thead>
          <tr>
            <th>{t.number}</th>
            <th>{t.name}</th>
            <th>{t.status}</th>
            <th>{t.health}</th>
            <th>{t.nights}</th>
            <th>{t.lastSeen}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td style={{ letterSpacing: "0.25em" }}>{m.memberNumber}</td>
              <td>
                {m.firstName} {m.lastName}
              </td>
              <td>{m.status}</td>
              <td>{m.roseHealth}</td>
              <td className="atelier-label">
                {m.eventsAttended}/{m.eventsInvited} · {m.eventsNoShow}
              </td>
              <td>{fmt(m.lastAttendanceAt)}</td>
              <td>
                <form action={pauseMember}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="atelier-action">
                    {m.status === "PAUSED" ? t.unpause : t.pause}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {members.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ color: "var(--chalk-dim)" }}>
                {t.empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
