"use server";

// her one decision. YES is race-safe: the event row is locked and confirmed
// RSVPs are counted inside the same transaction — one seat cannot go twice.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";

export type RsvpOutcome = "CONFIRMED" | "DECLINED" | "FULL" | "CLOSED" | "NONE";

export async function respond(input: {
  eventId: string;
  answer: "YES" | "NOT_THIS_TIME";
}): Promise<RsvpOutcome> {
  const user = await requireVerifiedPhone();
  if (!user.memberId) return "NONE";
  const memberId = user.memberId;

  const parsed = z
    .object({ eventId: z.string().min(1), answer: z.enum(["YES", "NOT_THIS_TIME"]) })
    .safeParse(input);
  if (!parsed.success) return "NONE";
  const { eventId, answer } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    // lock the event row — every competing YES queues behind this
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

    const invitation = await tx.eventInvitation.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
      include: { event: true, rsvp: true },
    });
    if (!invitation || invitation.status === "REVOKED") return "NONE" as const;

    const event = invitation.event;
    const now = new Date();
    if (event.endsAt.getTime() < now.getTime()) return "CLOSED" as const;
    const deadline = event.rsvpDeadline;
    if (deadline && now.getTime() > deadline.getTime()) return "CLOSED" as const;

    if (answer === "YES") {
      const alreadyConfirmed = invitation.rsvp?.response === "CONFIRMED";
      if (!alreadyConfirmed) {
        const confirmed = await tx.rsvp.count({
          where: { eventId, response: "CONFIRMED" },
        });
        if (confirmed >= event.capacityRoses) return "FULL" as const;
      }
      await tx.rsvp.upsert({
        where: { invitationId: invitation.id },
        create: {
          eventId,
          memberId,
          invitationId: invitation.id,
          response: "CONFIRMED",
          confirmedAt: now,
          outcome: "PENDING",
        },
        update: {
          response: "CONFIRMED",
          confirmedAt: now,
          declinedAt: null,
          declinedEarly: false,
          outcome: "PENDING",
        },
      });
    } else {
      const declinedEarly = !deadline || now.getTime() < deadline.getTime();
      await tx.rsvp.upsert({
        where: { invitationId: invitation.id },
        create: {
          eventId,
          memberId,
          invitationId: invitation.id,
          response: "DECLINED",
          declinedAt: now,
          declinedEarly,
          outcome: declinedEarly ? "DECLINED_EARLY" : "DECLINED_LATE",
        },
        update: {
          response: "DECLINED",
          declinedAt: now,
          confirmedAt: null,
          declinedEarly,
          outcome: declinedEarly ? "DECLINED_EARLY" : "DECLINED_LATE",
        },
      });
    }

    await tx.eventInvitation.update({
      where: { id: invitation.id },
      data: { status: "RESPONDED", respondedAt: now },
    });

    return answer === "YES" ? ("CONFIRMED" as const) : ("DECLINED" as const);
  });

  revalidatePath("/rose");
  return result;
}
