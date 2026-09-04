// Thirty-six hours before the doors, every confirmed Rose and every paid Stem
// gets four digits. Nothing about the venue travels with them.
//
// Idempotency is structural, not remembered: a row that already carries a hash
// is skipped forever. If the send fails the hash is cleared, because an
// unsent code is worse than no code — the next run mints a fresh one.
import { copy, fill } from "@/content/copy";
import { sendSMS } from "@/lib/providers/sms";
import { generateDoorCode, hashDoorCode, roseCodeContext, stemCodeContext } from "@/lib/door/code";
import type { Db } from "@/lib/db/client";

export const ISSUE_BEFORE_MS = 36 * 60 * 60 * 1000;

export interface DoorCodeRun {
  roses: number;
  stems: number;
}

export async function issueDoorCodes(
  db: Db,
  now: Date = new Date(),
): Promise<DoorCodeRun> {
  const events = await db.event.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      startsAt: { lte: new Date(now.getTime() + ISSUE_BEFORE_MS) },
      endsAt: { gt: now },
    },
    select: { id: true, name: true },
  });

  const run: DoorCodeRun = { roses: 0, stems: 0 };

  for (const event of events) {
    const rsvps = await db.rsvp.findMany({
      where: { eventId: event.id, response: "CONFIRMED", doorCodeHash: null },
      select: { id: true, memberId: true, member: { select: { phone: true } } },
    });

    for (const rsvp of rsvps) {
      const code = generateDoorCode();
      await db.rsvp.update({
        where: { id: rsvp.id },
        data: {
          doorCodeHash: hashDoorCode(code, roseCodeContext(event.id, rsvp.memberId)),
          doorCodeIssuedAt: now,
        },
      });
      const sent = await sendSMS(db, {
        to: rsvp.member.phone,
        body: fill(copy.sms.doorCode, { name: event.name, code }),
        templateKey: "door_code",
        memberId: rsvp.memberId,
        eventId: event.id,
      }).catch(() => ({ ok: false as const, error: "send failed" }));

      if (sent.ok) {
        run.roses += 1;
      } else {
        await db.rsvp.update({
          where: { id: rsvp.id },
          data: { doorCodeHash: null, doorCodeIssuedAt: null },
        });
      }
    }

    const stems = await db.stemGuest.findMany({
      where: {
        eventId: event.id,
        paymentStatus: "PAID",
        doorCodeHash: null,
        deletedAt: null,
      },
      select: { id: true, phone: true },
    });

    for (const stem of stems) {
      const code = generateDoorCode();
      await db.stemGuest.update({
        where: { id: stem.id },
        data: {
          doorCodeHash: hashDoorCode(code, stemCodeContext(event.id, stem.id)),
          doorCodeIssuedAt: now,
        },
      });
      const sent = await sendSMS(db, {
        to: stem.phone,
        body: fill(copy.sms.doorCode, { name: event.name, code }),
        templateKey: "door_code",
        eventId: event.id,
        stemGuestId: stem.id,
      }).catch(() => ({ ok: false as const, error: "send failed" }));

      if (sent.ok) {
        run.stems += 1;
      } else {
        await db.stemGuest.update({
          where: { id: stem.id },
          data: { doorCodeHash: null, doorCodeIssuedAt: null },
        });
      }
    }
  }

  return run;
}
