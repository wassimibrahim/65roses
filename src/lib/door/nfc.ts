// NFC resolves who is standing there. It does not decide whether she comes in.
//
// Why the four digits still matter: a tag is a thing, and things are lent,
// lost, dropped in a bag someone else picks up, and cloned. Her Rose is hers
// forever and we will never take it back or invalidate it — which is exactly
// why possession of it cannot be proof of identity. The tag says "this is
// 0065's Rose". The code, sent to her phone an hour ago, says "and this is
// 0065". One is an object; the other is her.
//
// So this module answers one question — whose credential is this — and hands
// the answer to the same entry screen a name search would have opened.
import type { Db } from "@/lib/db/client";

export interface NfcMatch {
  subject: "ROSE" | "STEM";
  // the rsvp id or stem guest id the door already keys its roster on
  id: string;
}

/** Tag readers hand back all sorts of shapes; store and compare one. */
export function normalizeUid(raw: string): string {
  return raw.trim().replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

/**
 * Resolve a tag to tonight's roster entry. A Rose's tag is hers permanently,
 * so it is matched against the event she is on the list for; a Stem's bracelet
 * is event-scoped and dies with the night, so it is matched directly.
 */
export async function resolveNfc(
  db: Db,
  uid: string,
  eventId: string,
): Promise<NfcMatch | null> {
  const nfcUid = normalizeUid(uid);
  if (nfcUid.length < 8) return null;

  const rose = await db.roseCredential.findUnique({
    where: { nfcUid },
    select: { memberId: true, status: true },
  });
  if (rose && rose.status !== "REVOKED" && rose.status !== "LOST") {
    const rsvp = await db.rsvp.findFirst({
      where: { eventId, memberId: rose.memberId },
      select: { id: true },
    });
    if (rsvp) return { subject: "ROSE", id: rsvp.id };
    // her Rose is real but she is not on tonight's list; the door says so
    return null;
  }

  const stem = await db.stemCredential.findUnique({
    where: { nfcUid },
    select: { stemGuestId: true, eventId: true, status: true, validTo: true },
  });
  if (
    stem &&
    stem.eventId === eventId &&
    stem.status !== "REVOKED" &&
    stem.validTo.getTime() > Date.now()
  ) {
    return { subject: "STEM", id: stem.stemGuestId };
  }

  return null;
}
