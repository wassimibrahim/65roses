// /atelier/attendance — confirmed against arrived, per night.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { atelierCity } from "@/lib/atelier/city";
import { atelierUser } from "../guard";
import { markNoShows, undoNoShow } from "./actions";

const clock = (d: Date | null) =>
  d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "—";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  await atelierUser();
  const city = await atelierCity();
  const params = await searchParams;
  const t = copy.atelier.attendance;

  const events = await prisma.event.findMany({
    where: { deletedAt: null, city, status: { notIn: ["DRAFT", "CANCELLED"] } },
    orderBy: { startsAt: "desc" },
    take: 40,
    select: { id: true, index: true, name: true, endsAt: true },
  });

  const selected = events.find((e) => e.id === params.event) ?? events[0] ?? null;

  const rsvps = selected
    ? await prisma.rsvp.findMany({
        where: { eventId: selected.id, response: "CONFIRMED" },
        orderBy: [{ outcome: "asc" }, { member: { memberNumber: "asc" } }],
        select: {
          id: true,
          outcome: true,
          checkInId: true,
          checkIn: { select: { enteredAt: true, verifyMethod: true } },
          member: { select: { id: true, memberNumber: true, firstName: true, lastName: true } },
        },
      })
    : [];

  const arrived = rsvps.filter((r) => r.checkInId).length;
  const closed = selected ? selected.endsAt.getTime() < Date.now() : false;

  return (
    <div className="flex flex-col gap-6 px-6 py-5">
      <div className="flex flex-wrap items-center gap-5">
        {events.map((e) => (
          <Link
            key={e.id}
            href={`/atelier/attendance?event=${e.id}`}
            style={{
              color: e.id === selected?.id ? "var(--chalk)" : "var(--chalk-dim)",
              fontSize: "0.75rem",
              letterSpacing: "0.12em",
            }}
          >
            {e.index} {e.name}
          </Link>
        ))}
      </div>

      {selected ? (
        <>
          <div className="flex items-center gap-6">
            <span className="atelier-label">
              {t.confirmed} {rsvps.length} · {t.arrived} {arrived} · {t.missing}{" "}
              {rsvps.length - arrived}
            </span>
            {closed ? (
              <form action={markNoShows}>
                <input type="hidden" name="eventId" value={selected.id} />
                <button type="submit" className="atelier-action">
                  {t.markNoShows}
                </button>
              </form>
            ) : null}
          </div>

          <table className="atelier-table">
            <thead>
              <tr>
                <th>{copy.atelier.members.number}</th>
                <th>{copy.atelier.members.name}</th>
                <th>{t.at}</th>
                <th>{t.method}</th>
                <th>{copy.atelier.members.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id}>
                  <td style={{ letterSpacing: "0.25em" }}>{r.member.memberNumber}</td>
                  <td>
                    {r.member.firstName} {r.member.lastName}
                  </td>
                  <td>{clock(r.checkIn?.enteredAt ?? null)}</td>
                  <td className="atelier-label">{r.checkIn?.verifyMethod ?? "—"}</td>
                  <td>{r.outcome}</td>
                  <td>
                    {r.outcome === "NO_SHOW" ? (
                      <form action={undoNoShow} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input className="atelier-input" name="reason" aria-label={t.reason} required />
                        <button type="submit" className="atelier-action">
                          {t.undo}
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rsvps.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--chalk-dim)" }}>
                    {t.empty}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </>
      ) : (
        <span style={{ color: "var(--chalk-dim)" }}>{t.empty}</span>
      )}
    </div>
  );
}
