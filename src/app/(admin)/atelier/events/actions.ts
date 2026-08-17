"use server";

// event creation and invitation sending. Invitations are queued one MessageLog row per
// member; the unique (eventId, memberId) constraint makes double-sending impossible.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { eventSchema, slugify } from "@/lib/validation/event";
import { timezoneForCity, utcFromZoned } from "@/lib/time";
import { invitationMessages } from "@/content/messages";
import { sendSMS } from "@/lib/providers/sms";
import { sendEmail } from "@/lib/providers/email";

async function actionContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function createEvent(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const input = parsed.data;

  const timezone = timezoneForCity(input.city);
  // the night begins at 00:00 and ends at 05:00, in the event's timezone
  const startsAt = utcFromZoned(input.date, "00:00", timezone);
  const endsAt = utcFromZoned(input.date, "05:00", timezone);
  const venueRevealAt = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);

  const slug = slugify(input.name);
  const taken = await prisma.event.findFirst({
    where: { OR: [{ slug }, { index: input.index }] },
    select: { id: true },
  });
  if (taken) return;

  const event = await prisma.event.create({
    data: {
      name: input.name,
      index: input.index,
      slug,
      city: input.city,
      startsAt,
      endsAt,
      timezone,
      venueName: input.venueName || null,
      venueAddress: input.venueAddress || null,
      venueNotes: input.venueNotes || null,
      venueRevealAt,
      status: "ANNOUNCED",
      capacityTotal: input.capacityTotal,
      capacityRoses: input.capacityRoses,
      capacityStems: input.capacityStems,
      rsvpOpensAt: input.rsvpOpensAt
        ? utcFromZoned(input.rsvpOpensAt.slice(0, 10), input.rsvpOpensAt.slice(11, 16), timezone)
        : null,
      rsvpDeadline: input.rsvpDeadline
        ? utcFromZoned(input.rsvpDeadline.slice(0, 10), input.rsvpDeadline.slice(11, 16), timezone)
        : null,
      stemsAllowed: input.stemsAllowed,
      stemPriceCents: input.stemPriceCents,
      stemCurrency: input.stemCurrency,
      editionMark: input.editionMark,
      tablesEnabled: input.tablesEnabled,
      tablesRemovedAtLocal: input.tablesRemovedAtLocal,
    },
    select: { id: true, index: true },
  });

  await audit(prisma, {
    action: "event.create",
    entityType: "Event",
    entityId: event.id,
    actorId: admin.id,
    after: { index: event.index },
    ip,
    userAgent,
  });

  revalidatePath("/atelier/events");
}

export async function sendInvitations(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({ eventId: z.string().min(1), memberIds: z.array(z.string()).min(1) })
    .parse({
      eventId: formData.get("eventId"),
      memberIds: formData.getAll("memberIds"),
    });

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: input.eventId },
    select: { id: true, index: true, name: true, slug: true, status: true },
  });

  const members = await prisma.memberProfile.findMany({
    where: { id: { in: input.memberIds }, deletedAt: null },
    select: {
      id: true,
      phone: true,
      user: { select: { email: true } },
    },
  });

  const messages = invitationMessages(event, process.env.NEXT_PUBLIC_APP_URL ?? "");
  const invitedIds: string[] = [];

  for (const member of members) {
    // the unique constraint is the guarantee: an existing invitation means no resend, ever
    try {
      await prisma.eventInvitation.create({
        data: { eventId: event.id, memberId: member.id },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }

    await sendSMS(prisma, {
      to: member.phone,
      body: messages.sms,
      templateKey: "invitation",
      memberId: member.id,
      eventId: event.id,
    }).catch(() => {});
    await sendEmail(prisma, {
      msg: { to: member.user.email, ...messages.email },
      templateKey: "invitation",
      memberId: member.id,
      eventId: event.id,
    }).catch(() => {});
    invitedIds.push(member.id);
  }

  const sent = invitedIds.length;
  if (sent > 0) {
    await prisma.memberProfile.updateMany({
      where: { id: { in: invitedIds } },
      data: { lastInvitedAt: new Date(), eventsInvited: { increment: 1 } },
    });
  }
  if (event.status === "ANNOUNCED") {
    await prisma.event.update({ where: { id: event.id }, data: { status: "INVITING" } });
  }
  await audit(prisma, {
    action: "event.invitations.send",
    entityType: "Event",
    entityId: event.id,
    actorId: admin.id,
    after: { requested: input.memberIds.length, sent },
    ip,
    userAgent,
  });

  revalidatePath(`/atelier/events/${event.id}`);
}
