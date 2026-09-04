// After the night: settle what happened, then say one short thing to whoever
// confirmed and did not arrive.
//
// Two passes, deliberately separate. Settling happens as soon as the doors
// close, because the door interface and the atelier need the truth immediately.
// The message waits until the day after — nobody is written to at 06:00.
import { copy } from "@/content/copy";
import { sendSMS } from "@/lib/providers/sms";
import { audit } from "@/lib/audit";
import { recomputeRoseHealth } from "@/lib/rose-health";
import { HISTORY_WINDOW } from "@/lib/rose-health/weights";
import type { Db } from "@/lib/db/client";

// the follow-up waits this long after the doors close
export const FOLLOW_UP_AFTER_MS = 14 * 60 * 60 * 1000;

const NO_SHOW_TEMPLATES = ["missed_you", "still_with_us", "rose_quiet"] as const;

export interface PostEventRun {
  settled: number;
  messaged: number;
}

/**
 * Close every event whose doors have shut: confirmed-and-checked-in becomes
 * ATTENDED, confirmed-and-absent becomes NO_SHOW, and every Rose who was on the
 * list has her standing recomputed. Re-running is free — CLOSED events are skipped.
 */
async function settleEvents(db: Db, now: Date): Promise<number> {
  const events = await db.event.findMany({
    where: {
      deletedAt: null,
      endsAt: { lt: now },
      status: { notIn: ["CLOSED", "CANCELLED", "DRAFT"] },
    },
    select: { id: true },
  });

  for (const event of events) {
    const rsvps = await db.rsvp.findMany({
      where: { eventId: event.id, outcome: "PENDING" },
      select: { id: true, memberId: true, response: true, checkInId: true },
    });

    for (const rsvp of rsvps) {
      const outcome =
        rsvp.response !== "CONFIRMED" ? null : rsvp.checkInId ? "ATTENDED" : "NO_SHOW";
      if (!outcome) continue;
      await db.rsvp.update({ where: { id: rsvp.id }, data: { outcome } });
    }

    await db.stemGuest.updateMany({
      where: { eventId: event.id, outcome: "PENDING", paymentStatus: "PAID", checkIn: null },
      data: { outcome: "NO_SHOW" },
    });

    // his bracelet dies with the night
    await db.stemCredential.updateMany({
      where: { eventId: event.id, status: { in: ["ASSIGNED", "ACTIVE"] } },
      data: { status: "EXPIRED" },
    });

    for (const memberId of new Set(rsvps.map((r) => r.memberId))) {
      await recomputeRoseHealth(db, memberId);
    }

    await db.event.update({ where: { id: event.id }, data: { status: "CLOSED" } });
    await audit(db, {
      action: "event.close",
      entityType: "Event",
      entityId: event.id,
      after: { settled: rsvps.length },
    });
  }

  return events.length;
}

/**
 * One sentence to a Rose who confirmed and did not come. Never twice for the
 * same night, never more than one of the three, and never an explanation of a
 * policy — the escalation is carried by the words getting shorter, not longer.
 */
async function followUp(db: Db, now: Date): Promise<number> {
  const events = await db.event.findMany({
    where: {
      deletedAt: null,
      status: "CLOSED",
      endsAt: { lt: new Date(now.getTime() - FOLLOW_UP_AFTER_MS) },
      // a night older than a week is history; we do not write to it
      startsAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  let messaged = 0;

  for (const event of events) {
    const absent = await db.rsvp.findMany({
      where: { eventId: event.id, outcome: "NO_SHOW" },
      select: { memberId: true, member: { select: { phone: true, status: true } } },
    });

    for (const row of absent) {
      const already = await db.messageLog.count({
        where: {
          eventId: event.id,
          memberId: row.memberId,
          templateKey: { in: [...NO_SHOW_TEMPLATES] },
          status: { not: "FAILED" },
        },
      });
      if (already > 0) continue;

      // how many times this has happened across the window we weigh,
      // this night included
      const recent = await db.rsvp
        .findMany({
          where: { memberId: row.memberId, outcome: "NO_SHOW" },
          orderBy: { event: { startsAt: "desc" } },
          take: HISTORY_WINDOW,
          select: { id: true },
        })
        .then((rows) => rows.length);

      const step = Math.min(recent, 3);
      const body =
        step <= 1
          ? copy.sms.missedYou
          : step === 2
            ? copy.sms.stillWithUs
            : copy.sms.roseQuiet;
      const templateKey = NO_SHOW_TEMPLATES[step - 1] ?? NO_SHOW_TEMPLATES[0];

      const sent = await sendSMS(db, {
        to: row.member.phone,
        body,
        templateKey,
        memberId: row.memberId,
        eventId: event.id,
      }).catch(() => ({ ok: false as const, error: "send failed" }));
      if (sent.ok) messaged += 1;
    }
  }

  return messaged;
}

export async function closeAndFollowUp(db: Db, now: Date = new Date()): Promise<PostEventRun> {
  const settled = await settleEvents(db, now);
  const messaged = await followUp(db, now);
  return { settled, messaged };
}
