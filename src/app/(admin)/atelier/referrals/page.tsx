// /atelier/referrals — the queue, with the referring Rose's record inline so the
// referral can be weighted. Nothing here ever selects by appearance.
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { atelierUser } from "../guard";
import { declineReferral, inviteReferral, reviewReferral } from "./actions";

export default async function ReferralsPage() {
  await atelierUser();

  const referrals = await prisma.referral.findMany({
    where: { status: { in: ["SUBMITTED", "REVIEWING", "INVITED"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      authorMember: {
        select: {
          memberNumber: true,
          firstName: true,
          eventsInvited: true,
          eventsAttended: true,
          eventsNoShow: true,
        },
      },
    },
  });

  const t = copy.atelier.referrals;

  return (
    <div className="px-6 py-5">
      <table className="atelier-table">
        <thead>
          <tr>
            <th>{copy.atelier.applications.columns.handle}</th>
            <th>{copy.atelier.applications.columns.referral}</th>
            <th>{t.nights}</th>
            <th>{copy.atelier.applications.columns.status}</th>
            <th>{copy.atelier.applications.notes}</th>
            <th>{t.link}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {referrals.map((r) => (
            <tr key={r.id}>
              <td>
                <a
                  href={`https://instagram.com/${r.instagramHandle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{r.instagramHandle}
                </a>
              </td>
              <td>
                {r.authorMember.memberNumber} · {r.authorMember.firstName}
              </td>
              <td className="atelier-label">
                {r.authorMember.eventsAttended}/{r.authorMember.eventsInvited} ·{" "}
                {r.authorMember.eventsNoShow}
              </td>
              <td>{r.status}</td>
              <td style={{ color: "var(--chalk-dim)" }}>{r.note ?? "—"}</td>
              <td className="atelier-label">
                {r.inviteToken &&
                r.status === "INVITED" &&
                r.inviteExpiresAt &&
                r.inviteExpiresAt.getTime() > Date.now()
                  ? `${process.env.NEXT_PUBLIC_APP_URL}/apply?r=${r.inviteToken}`
                  : "—"}
              </td>
              <td>
                <div className="flex gap-2">
                  {r.status !== "INVITED" ? (
                    <>
                      <form action={inviteReferral}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="atelier-action">
                          {t.invite}
                        </button>
                      </form>
                      <form action={reviewReferral}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="atelier-action">
                          {t.reviewing}
                        </button>
                      </form>
                      <form action={declineReferral}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="atelier-action">
                          {t.decline}
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {referrals.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ color: "var(--chalk-dim)" }}>
                {copy.atelier.applications.empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
