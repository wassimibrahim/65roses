// The one message in the whole system that carries an address.
//
// It goes to confirmed Roses and to nobody else. A Stem is never told where the
// night is — HE CAN'T ASK US. ASK HER. The address reaches him through her, which
// is also what section 10 requires: he sees the night, the hours, and her first name.
//
// Idempotency: MessageLog is the ledger. A member who already has a "venue" row
// for this event is never sent it twice.
import { copy, fill } from "@/content/copy";
import { sendSMS } from "@/lib/providers/sms";
import type { Db } from "@/lib/db/client";

export async function revealVenue(db: Db, now: Date = new Date()): Promise<number> {
  const events = await db.event.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      venueRevealAt: { not: null, lte: now },
      endsAt: { gt: now },
      venueName: { not: null },
    },
    select: { id: true, name: true, venueName: true, venueAddress: true },
  });

  let sent = 0;

  for (const event of events) {
    const already = await db.messageLog.findMany({
      // a failed send is not a delivery — the next run tries her again
      where: { eventId: event.id, templateKey: "venue", status: { not: "FAILED" } },
      select: { memberId: true },
    });
    const told = new Set(already.map((m) => m.memberId));

    const rsvps = await db.rsvp.findMany({
      where: { eventId: event.id, response: "CONFIRMED" },
      select: { memberId: true, member: { select: { phone: true } } },
    });

    const venue = [event.venueName, event.venueAddress].filter(Boolean).join(", ");

    for (const rsvp of rsvps) {
      if (told.has(rsvp.memberId)) continue;
      const result = await sendSMS(db, {
        to: rsvp.member.phone,
        body: fill(copy.sms.venue, { name: event.name, venue }),
        templateKey: "venue",
        memberId: rsvp.memberId,
        eventId: event.id,
      }).catch(() => ({ ok: false as const, error: "send failed" }));
      if (result.ok) sent += 1;
    }
  }

  return sent;
}
