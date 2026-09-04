// /atelier/circle — the two groups and who is in them.
//
// Two concepts kept apart on purpose: ANNOUNCEMENTS is where we speak and she
// reads; ROSES is where Roses speak to each other. Only the second is ever
// handed out by JOIN.
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { getSetting, GROUP_KEY } from "@/lib/settings";
import { atelierUser } from "../guard";
import { rotateCircleLink, setCommunityStatus } from "./actions";

const STATUSES = ["NOT_INVITED", "INVITED", "JOINED", "LEFT", "REMOVED"] as const;

export default async function CirclePage() {
  await atelierUser();
  const t = copy.atelier.circle;

  const [announcements, roses] = await Promise.all([
    getSetting(prisma, GROUP_KEY.ANNOUNCEMENTS),
    getSetting(prisma, GROUP_KEY.ROSES),
  ]);

  const members = await prisma.memberProfile.findMany({
    where: { deletedAt: null },
    orderBy: { memberNumber: "asc" },
    take: 500,
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      status: true,
      communityStatus: true,
    },
  });

  const groups: { label: string; group: "ANNOUNCEMENTS" | "ROSES"; link: string | null }[] = [
    { label: t.announcements, group: "ANNOUNCEMENTS", link: announcements },
    { label: t.roses, group: "ROSES", link: roses },
  ];

  return (
    <div className="flex flex-col gap-10 px-6 py-5">
      <section className="flex flex-col gap-5">
        {groups.map((g) => (
          <form
            key={g.group}
            action={rotateCircleLink}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="group" value={g.group} />
            <span className="atelier-label" style={{ width: "9rem" }}>
              {g.label}
            </span>
            <span style={{ color: "var(--chalk-dim)", fontSize: "0.75rem" }}>
              {g.link ? `${g.link.slice(0, 34)}…` : t.never}
            </span>
            <input
              className="atelier-input flex-1"
              name="link"
              type="url"
              aria-label={t.link}
              required
            />
            <button type="submit" className="atelier-action">
              {t.rotate}
            </button>
          </form>
        ))}
      </section>

      <table className="atelier-table">
        <thead>
          <tr>
            <th>{copy.atelier.members.number}</th>
            <th>{copy.atelier.members.name}</th>
            <th>{copy.atelier.members.status}</th>
            <th>{t.status}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td style={{ letterSpacing: "0.25em" }}>{m.memberNumber}</td>
              <td>{m.firstName}</td>
              <td>{m.status}</td>
              <td>{m.communityStatus}</td>
              <td>
                <form action={setCommunityStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <select
                    className="atelier-input"
                    name="status"
                    defaultValue={m.communityStatus}
                    aria-label={t.status}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="atelier-action">
                    {copy.atelier.deliveries.save}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {members.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: "var(--chalk-dim)" }}>
                {t.empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
