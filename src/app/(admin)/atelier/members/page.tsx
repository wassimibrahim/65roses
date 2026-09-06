// /atelier/members — the Roses. The wake queue sits on top because it is the
// only list here where someone is waiting for an answer.
//
// roseHealth is visible on this page and on the member detail, and on no other.
// It never crosses into a member-facing response; the DTO is what guarantees
// that, not this comment.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import {
  COMMUNITY_STATUSES,
  MEMBER_STATUSES,
  memberWhere,
  type MemberFilters,
} from "@/lib/atelier/member-filters";
import { atelierCity } from "@/lib/atelier/city";
import { atelierUser } from "../guard";
import { approveWake, dismissWake, inviteMembers, setMemberStatus } from "./actions";

const fmt = (d: Date | null) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "—";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<MemberFilters>;
}) {
  const admin = await atelierUser();
  const filters = await searchParams;
  // her home city, defaulted from the atelier's mode. She belongs to one city
  // and can still be invited in another, so this is a default and not a fence:
  // choosing ANY in the filter shows every Rose.
  const city = await atelierCity();
  const scoped = { ...filters, city: filters.city ?? city };
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
    where: memberWhere(scoped),
    orderBy: { memberNumber: "asc" },
    take: 500,
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      instagramHandle: true,
      status: true,
      foundingRose: true,
      roseHealth: true,
      eventsInvited: true,
      eventsAttended: true,
      eventsNoShow: true,
      lastAttendanceAt: true,
      communityStatus: true,
    },
  });

  // nights she could still be invited to
  const upcoming = await prisma.event.findMany({
    where: {
      deletedAt: null,
      city,
      status: { in: ["ANNOUNCED", "INVITING", "LOCKED"] },
      startsAt: { gt: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
    select: { id: true, index: true, name: true },
  });

  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();

  return (
    <div className="flex flex-col gap-8 px-6 py-5">
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

      <form action="/atelier/members" className="flex flex-wrap items-end gap-3">
        <select className="atelier-input" name="status" defaultValue={filters.status ?? ""}>
          <option value="">{t.any}</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="atelier-input" name="city" defaultValue={scoped.city}>
          <option value="">{t.any}</option>
          {["BEIRUT", "MADRID"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="atelier-input" name="community" defaultValue={filters.community ?? ""}>
          <option value="">{t.community}</option>
          {COMMUNITY_STATUSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="atelier-input" name="delivered" defaultValue={filters.delivered ?? ""}>
          <option value="">{t.delivered}</option>
          {["1", "0"].map((v) => (
            <option key={v} value={v}>
              {v === "1" ? "YES" : "NO"}
            </option>
          ))}
        </select>
        <label className="atelier-label flex items-center gap-2">
          {t.founding}
          <input type="checkbox" name="founding" value="1" defaultChecked={filters.founding === "1"} />
        </label>
        <input
          className="atelier-input w-16"
          name="noShows"
          inputMode="numeric"
          defaultValue={filters.noShows ?? ""}
          aria-label={t.noShows}
        />
        <input
          className="atelier-input"
          name="lastFrom"
          type="date"
          defaultValue={filters.lastFrom ?? ""}
          aria-label={t.lastSeen}
        />
        <input
          className="atelier-input"
          name="lastTo"
          type="date"
          defaultValue={filters.lastTo ?? ""}
          aria-label={t.lastSeen}
        />
        <input
          className="atelier-input"
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          aria-label={copy.atelier.applications.search}
        />
        <button type="submit" className="atelier-action">
          {t.apply}
        </button>
        <Link href="/atelier/members" className="atelier-action">
          {t.clear}
        </Link>
        <a href={`/atelier/members/export?${query}`} className="atelier-action">
          {t.exportCsv}
        </a>
        {/* addresses leave the building only for an owner, and only on purpose */}
        {admin.role === "OWNER" ? (
          <a
            href={`/atelier/members/export?${query}${query ? "&" : ""}addresses=1`}
            className="atelier-action"
          >
            {t.withAddresses}
          </a>
        ) : null}
      </form>

      {/* one form, two submit buttons: the checked rows serve whichever the
          person presses, so nothing has to be selected twice */}
      <form className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className="atelier-input" name="status" defaultValue="QUIET">
            {MEMBER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" formAction={setMemberStatus} className="atelier-action">
            {t.status}
          </button>

          <select className="atelier-input" name="inviteEventId" defaultValue="">
            <option value="">{t.inviteTo}</option>
            {upcoming.map((e) => (
              <option key={e.id} value={e.id}>
                {e.index} {e.name}
              </option>
            ))}
          </select>
          <button type="submit" formAction={inviteMembers} className="atelier-action">
            {t.inviteTo}
          </button>
        </div>

        <table className="atelier-table">
          <thead>
            <tr>
              <th />
              <th>{t.number}</th>
              <th>{t.name}</th>
              <th>{t.handle}</th>
              <th>{t.status}</th>
              <th>{t.health}</th>
              <th>{t.lastSeen}</th>
              <th>{t.nights}</th>
              <th>{t.flags}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <input type="checkbox" name="ids" value={m.id} aria-label={t.name} />
                </td>
                <td style={{ letterSpacing: "0.25em" }}>{m.memberNumber}</td>
                <td>
                  {m.firstName} {m.lastName}
                </td>
                <td>
                  <a
                    href={`https://instagram.com/${m.instagramHandle}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{m.instagramHandle}
                  </a>
                </td>
                <td>{m.status}</td>
                <td>{m.roseHealth}</td>
                <td>{fmt(m.lastAttendanceAt)}</td>
                <td className="atelier-label">
                  {m.eventsAttended}/{m.eventsInvited}
                </td>
                <td className="atelier-label">
                  {[m.foundingRose ? t.founding : null, m.eventsNoShow > 0 ? m.eventsNoShow : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td>
                  <Link href={`/atelier/members/${m.id}`} className="atelier-label">
                    {t.detail}
                  </Link>
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ color: "var(--chalk-dim)" }}>
                  {t.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </form>
    </div>
  );
}
