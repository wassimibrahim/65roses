// /atelier/events — the nights, and the form that creates one.
//
// The list and the form both follow the city the atelier is in, so capacities
// and currency arrive already right rather than being typed from memory.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { atelierCity } from "@/lib/atelier/city";
import { CITY_DEFAULTS } from "@/lib/cities";
import { atelierUser } from "../guard";
import { createEvent } from "./actions";

export default async function EventsPage() {
  await atelierUser();
  const city = await atelierCity();
  const defaults = CITY_DEFAULTS[city];

  const events = await prisma.event.findMany({
    where: { deletedAt: null, city },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      index: true,
      name: true,
      city: true,
      startsAt: true,
      status: true,
      _count: { select: { invitations: true, stemGuests: true } },
    },
  });

  const last = await prisma.event.findFirst({
    orderBy: { index: "desc" },
    select: { index: true },
  });
  const nextIndex = String(Number(last?.index ?? "000") + 1).padStart(3, "0");
  const t = copy.atelier.events;

  return (
    <div className="flex flex-col gap-10 px-6 py-5 lg:flex-row">
      <div className="min-w-0 flex-1">
        <table className="atelier-table">
          <thead>
            <tr>
              <th>{t.index}</th>
              <th>{t.name}</th>
              <th>{t.city}</th>
              <th>{t.date}</th>
              <th>{copy.atelier.applications.columns.status}</th>
              <th>{t.invite.invited}</th>
              <th>{t.stems}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.index}</td>
                <td>
                  <Link href={`/atelier/events/${event.id}`}>{event.name}</Link>
                </td>
                <td>{event.city}</td>
                <td>{event.startsAt.toISOString().slice(0, 10)}</td>
                <td>{event.status}</td>
                <td>{event._count.invitations}</td>
                <td>{event._count.stemGuests}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: "var(--chalk-dim)" }}>
                  {copy.atelier.applications.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <aside
        className="w-full shrink-0 lg:w-[24rem] lg:pl-8"
        style={{ borderLeft: "1px solid rgba(232, 226, 214, 0.08)" }}
      >
        <div className="mb-4 atelier-label">{t.create}</div>
        {/* every default in this form comes from the city, so the form's
            identity does too — otherwise switching city leaves the old
            uncontrolled values sitting in the DOM */}
        <form
          key={city}
          action={createEvent}
          className="grid grid-cols-2 gap-3"
          style={{ fontSize: "0.75rem" }}
        >
          <label className="col-span-2 flex flex-col gap-1">
            <span className="atelier-label">{t.name}</span>
            <input
              className="atelier-input"
              name="name"
              required
              style={{ textTransform: "uppercase" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.index}</span>
            <input
              className="atelier-input"
              name="index"
              defaultValue={nextIndex}
              pattern="\d{3}"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.city}</span>
            <select className="atelier-input" name="city" defaultValue={city}>
              {["BEIRUT", "MADRID"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.date}</span>
            <input className="atelier-input" name="date" type="date" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.editionMark}</span>
            <input className="atelier-input" name="editionMark" required />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="atelier-label">{t.venue}</span>
            <input className="atelier-input" name="venueName" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="atelier-label">{t.address}</span>
            <input className="atelier-input" name="venueAddress" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="atelier-label">{t.notes}</span>
            <input className="atelier-input" name="venueNotes" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.capacity}</span>
            <input
              className="atelier-input"
              name="capacityTotal"
              type="number"
              defaultValue={defaults.capacityTotal}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.roses}</span>
            <input
              className="atelier-input"
              name="capacityRoses"
              type="number"
              defaultValue={defaults.capacityRoses}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.stems}</span>
            <input
              className="atelier-input"
              name="capacityStems"
              type="number"
              defaultValue={defaults.capacityStems}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.stemPrice}</span>
            <input
              className="atelier-input"
              name="stemPriceCents"
              type="number"
              defaultValue={defaults.stemPriceCents}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.rsvpOpens}</span>
            <input className="atelier-input" name="rsvpOpensAt" type="datetime-local" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.rsvpDeadline}</span>
            <input className="atelier-input" name="rsvpDeadline" type="datetime-local" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="stemsAllowed" value="true" defaultChecked />
            <span className="atelier-label">{t.stemsAllowed}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="tablesEnabled" value="true" defaultChecked />
            <span className="atelier-label">{t.tables}</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="atelier-label">{t.tablesOutAt}</span>
            <input
              className="atelier-input"
              name="tablesRemovedAtLocal"
              defaultValue="01:00"
              pattern="\d{2}:\d{2}"
            />
          </label>
          <div className="col-span-2 mt-2">
            <button type="submit" className="atelier-action">
              {t.create}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
