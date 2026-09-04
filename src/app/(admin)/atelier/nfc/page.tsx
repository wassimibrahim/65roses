// /atelier/nfc — binding tags to objects.
//
// The field takes a typed uid or a scanned one; a USB reader is a keyboard and
// types into it either way. Bracelets are event-scoped and expire, so only
// tonight's and the coming nights' are listed.
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { atelierUser } from "../guard";
import { bindNfc, unbindNfc } from "./actions";

export default async function NfcPage() {
  await atelierUser();
  const t = copy.atelier.nfc;

  const roses = await prisma.memberProfile.findMany({
    where: { deletedAt: null, roseCredential: { isNot: null } },
    orderBy: { memberNumber: "asc" },
    take: 300,
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      roseCredential: { select: { id: true, serial: true, status: true, nfcUid: true } },
    },
  });

  const stems = await prisma.stemCredential.findMany({
    where: { validTo: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      braceletSerial: true,
      editionMark: true,
      nfcUid: true,
      status: true,
      event: { select: { index: true, name: true } },
      stemGuest: { select: { firstName: true, hostMember: { select: { memberNumber: true } } } },
    },
  });

  return (
    <div className="flex flex-col gap-10 px-6 py-5">
      <section className="flex flex-col gap-3">
        <span className="atelier-label">
          {t.rose} · {t.hint}
        </span>
        <table className="atelier-table">
          <thead>
            <tr>
              <th>{copy.atelier.members.number}</th>
              <th>{copy.atelier.members.name}</th>
              <th>{copy.atelier.members.serial}</th>
              <th>{t.bound}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {roses.map((rose) => (
              <tr key={rose.id}>
                <td style={{ letterSpacing: "0.25em" }}>{rose.memberNumber}</td>
                <td>{rose.firstName}</td>
                <td className="atelier-label">{rose.roseCredential?.serial}</td>
                <td className="atelier-label">
                  {rose.roseCredential?.nfcUid ? `…${rose.roseCredential.nfcUid.slice(-6)}` : "—"}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <form action={bindNfc} className="flex items-center gap-2">
                      <input type="hidden" name="subject" value="ROSE" />
                      <input type="hidden" name="id" value={rose.id} />
                      <input className="atelier-input" name="uid" aria-label={t.uid} required />
                      <button type="submit" className="atelier-action">
                        {t.bind}
                      </button>
                    </form>
                    {rose.roseCredential?.nfcUid ? (
                      <form action={unbindNfc}>
                        <input type="hidden" name="subject" value="ROSE" />
                        <input type="hidden" name="id" value={rose.roseCredential.id} />
                        <button type="submit" className="atelier-action">
                          {t.unbind}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {roses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--chalk-dim)" }}>
                  {t.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <span className="atelier-label">{t.stem}</span>
        <table className="atelier-table">
          <thead>
            <tr>
              <th>{copy.atelier.attendance.at}</th>
              <th>{copy.atelier.members.name}</th>
              <th>{copy.door.bracelet}</th>
              <th>{t.bound}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {stems.map((stem) => (
              <tr key={stem.id}>
                <td className="atelier-label">
                  {stem.event.index} {stem.event.name}
                </td>
                <td>
                  {stem.stemGuest.firstName} · {stem.stemGuest.hostMember.memberNumber}
                </td>
                <td className="atelier-label">{stem.braceletSerial ?? stem.editionMark}</td>
                <td className="atelier-label">
                  {stem.nfcUid ? `…${stem.nfcUid.slice(-6)}` : "—"}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <form action={bindNfc} className="flex items-center gap-2">
                      <input type="hidden" name="subject" value="STEM" />
                      <input type="hidden" name="id" value={stem.id} />
                      <input className="atelier-input" name="uid" aria-label={t.uid} required />
                      <button type="submit" className="atelier-action">
                        {t.bind}
                      </button>
                    </form>
                    {stem.nfcUid ? (
                      <form action={unbindNfc}>
                        <input type="hidden" name="subject" value="STEM" />
                        <input type="hidden" name="id" value={stem.id} />
                        <button type="submit" className="atelier-action">
                          {t.unbind}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {stems.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--chalk-dim)" }}>
                  {t.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
