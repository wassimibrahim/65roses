// Everything the door can do to a record, in one server module, so the rules
// live in one place and the interface only renders their answers.
import { z } from "zod";
import type { Db } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { consume, type RateLimitPreset } from "@/lib/rate-limit";
import { checkDoorCode, roseCodeContext, stemCodeContext, type DoorCodeVerdict } from "./code";
import { isWithinDoorWindow } from "./code";

// three wrong codes and that record rests for a minute
export const wrongCodeLimit: RateLimitPreset = {
  name: "door-code",
  limit: 3,
  windowMs: 60_000,
};

export const doorEntrySchema = z.object({
  subject: z.enum(["ROSE", "STEM"]),
  id: z.string().min(1),
  code: z.string().regex(/^\d{4}$/).optional(),
  // an override needs a person's reason, not a checkbox
  reason: z.string().trim().min(3).max(200).optional(),
  // a check-in taken while the phone had no signal, replayed on reconnect
  offlineAt: z.string().datetime().optional(),
});

export type DoorEntryInput = z.infer<typeof doorEntrySchema>;

export type DoorResult =
  | { verdict: "IN"; enteredAt: string }
  | { verdict: "ALREADY_IN"; enteredAt: string }
  | { verdict: DoorCodeVerdict | "NOT_ON_LIST" | "NOT_PAID" | "ASK_A_HOST" | "LOCKED" };

interface Actor {
  id: string;
}

/**
 * Verify and admit. An override skips the code but never the audit row, and a
 * record that has taken three wrong codes in a minute is left alone.
 */
export async function admit(
  db: Db,
  eventId: string,
  actor: Actor,
  input: DoorEntryInput,
  now: Date = new Date(),
): Promise<DoorResult> {
  const event = await db.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { id: true, startsAt: true, endsAt: true },
  });
  if (!isWithinDoorWindow(event, now)) return { verdict: "CLOSED" };

  const enteredAt = input.offlineAt ? new Date(input.offlineAt) : now;
  const verifyMethod = input.reason ? "MANUAL" : input.offlineAt ? "OFFLINE" : "OTP";

  if (input.subject === "ROSE") {
    const rsvp = await db.rsvp.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        eventId: true,
        memberId: true,
        response: true,
        doorCodeHash: true,
        doorCodeUsedAt: true,
        checkInId: true,
        checkIn: { select: { enteredAt: true } },
        member: { select: { status: true } },
      },
    });
    if (!rsvp || rsvp.eventId !== eventId) return { verdict: "NOT_ON_LIST" };
    if (rsvp.checkInId && rsvp.checkIn) {
      return { verdict: "ALREADY_IN", enteredAt: rsvp.checkIn.enteredAt.toISOString() };
    }
    // her status is never explained in front of the door
    if (rsvp.member.status !== "ACTIVE" && rsvp.member.status !== "QUIET") {
      return { verdict: "ASK_A_HOST" };
    }
    if (rsvp.response !== "CONFIRMED" && !input.reason) return { verdict: "NOT_ON_LIST" };

    if (!input.reason && !input.offlineAt) {
      const gate = await consume(db, wrongCodeLimit, rsvp.id, now);
      if (!gate.allowed) return { verdict: "LOCKED" };
      const verdict = checkDoorCode(
        input.code ?? "",
        rsvp,
        roseCodeContext(eventId, rsvp.memberId),
        event,
        now,
      );
      if (verdict !== "OK") return { verdict };
    }

    const checkIn = await db.checkIn.create({
      data: {
        eventId,
        subject: "ROSE",
        memberId: rsvp.memberId,
        enteredAt,
        verifiedBy: actor.id,
        verifyMethod,
        overrideReason: input.reason,
      },
      select: { id: true, enteredAt: true },
    });
    await db.rsvp.update({
      where: { id: rsvp.id },
      data: { checkInId: checkIn.id, doorCodeUsedAt: now, outcome: "ATTENDED" },
    });
    await audit(db, {
      action: input.reason ? "door.override" : "door.enter",
      entityType: "Rsvp",
      entityId: rsvp.id,
      actorId: actor.id,
      after: { subject: "ROSE", verifyMethod, reason: input.reason },
    });
    return { verdict: "IN", enteredAt: checkIn.enteredAt.toISOString() };
  }

  const stem = await db.stemGuest.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      eventId: true,
      deletedAt: true,
      paymentStatus: true,
      doorCodeHash: true,
      doorCodeUsedAt: true,
      checkIn: { select: { id: true, enteredAt: true } },
    },
  });
  if (!stem || stem.eventId !== eventId || stem.deletedAt) return { verdict: "NOT_ON_LIST" };
  if (stem.checkIn) {
    return { verdict: "ALREADY_IN", enteredAt: stem.checkIn.enteredAt.toISOString() };
  }
  if (stem.paymentStatus !== "PAID") return { verdict: "NOT_PAID" };

  if (!input.reason && !input.offlineAt) {
    const gate = await consume(db, wrongCodeLimit, stem.id, now);
    if (!gate.allowed) return { verdict: "LOCKED" };
    const verdict = checkDoorCode(
      input.code ?? "",
      stem,
      stemCodeContext(eventId, stem.id),
      event,
      now,
    );
    if (verdict !== "OK") return { verdict };
  }

  const checkIn = await db.checkIn.create({
    data: {
      eventId,
      subject: "STEM",
      stemGuestId: stem.id,
      enteredAt,
      verifiedBy: actor.id,
      verifyMethod,
      overrideReason: input.reason,
    },
    select: { id: true, enteredAt: true },
  });
  await db.stemGuest.update({
    where: { id: stem.id },
    data: { doorCodeUsedAt: now, outcome: "ATTENDED" },
  });
  await db.stemCredential.updateMany({
    where: { stemGuestId: stem.id },
    data: { status: "ACTIVE" },
  });
  await audit(db, {
    action: input.reason ? "door.override" : "door.enter",
    entityType: "StemGuest",
    entityId: stem.id,
    actorId: actor.id,
    after: { subject: "STEM", verifyMethod, reason: input.reason },
  });
  return { verdict: "IN", enteredAt: checkIn.enteredAt.toISOString() };
}
