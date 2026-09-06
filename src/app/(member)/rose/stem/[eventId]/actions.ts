"use server";

// she registers him; we mint his opaque token. She can replace him until the
// deadline — the old token dies instantly, and a paid replacement is flagged
// for a human refund, never refunded silently.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { opaqueToken } from "@/lib/crypto/token";
import { stemSchema } from "@/lib/validation/stem";

async function confirmedContext(eventId: string) {
  const user = await requireVerifiedPhone();
  if (!user.memberId) return null;

  const rsvp = await prisma.rsvp.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.memberId } },
    include: {
      event: {
        select: {
          id: true,
          endsAt: true,
          rsvpDeadline: true,
          stemsAllowed: true,
          capacityStems: true,
        },
      },
    },
  });
  if (!rsvp || rsvp.response !== "CONFIRMED" || !rsvp.event.stemsAllowed) return null;
  if (rsvp.event.endsAt.getTime() < Date.now()) return null;
  return { user, memberId: user.memberId, event: rsvp.event };
}

export async function registerStem(
  eventId: string,
  input: unknown,
): Promise<{ ok: true; firstName: string; token: string } | { error: true }> {
  const ctx = await confirmedContext(z.string().min(1).parse(eventId));
  if (!ctx) return { error: true };

  const parsed = stemSchema.safeParse(input);
  if (!parsed.success) return { error: true };
  const stem = parsed.data;

  const existing = await prisma.stemGuest.findUnique({
    where: { eventId_hostMemberId: { eventId, hostMemberId: ctx.memberId } },
    select: { id: true, deletedAt: true },
  });
  if (existing && !existing.deletedAt) return { error: true }; // one Rose, one Stem

  const token = opaqueToken(10);
  const created = await prisma.stemGuest.upsert({
    where: { eventId_hostMemberId: { eventId, hostMemberId: ctx.memberId } },
    create: {
      eventId,
      hostMemberId: ctx.memberId,
      firstName: stem.firstName,
      lastName: stem.lastName,
      phone: stem.mobile,
      instagramHandle: stem.instagram || null,
      email: stem.email || null,
      dateOfBirth: stem.dateOfBirth,
      relationshipNote: stem.note || null,
      token,
      tokenExpiresAt: ctx.event.endsAt,
    },
    update: {
      firstName: stem.firstName,
      lastName: stem.lastName,
      phone: stem.mobile,
      instagramHandle: stem.instagram || null,
      email: stem.email || null,
      dateOfBirth: stem.dateOfBirth,
      relationshipNote: stem.note || null,
      token,
      tokenExpiresAt: ctx.event.endsAt,
      deletedAt: null,
      phoneVerified: false,
      paymentStatus: "NONE",
      outcome: "PENDING",
      openedAt: null,
      doorCodeHash: null,
      doorCodeIssuedAt: null,
      doorCodeUsedAt: null,
    },
    select: { id: true, firstName: true, token: true },
  });

  revalidatePath(`/rose/stem/${eventId}`);
  return { ok: true, firstName: created.firstName, token: created.token };
}

export async function replaceStem(eventId: string): Promise<{ ok: boolean }> {
  const ctx = await confirmedContext(z.string().min(1).parse(eventId));
  if (!ctx) return { ok: false };
  // replacement closes with the RSVP deadline
  if (ctx.event.rsvpDeadline && Date.now() > ctx.event.rsvpDeadline.getTime()) {
    return { ok: false };
  }

  const existing = await prisma.stemGuest.findUnique({
    where: { eventId_hostMemberId: { eventId, hostMemberId: ctx.memberId } },
    select: { id: true, deletedAt: true, paymentStatus: true },
  });
  if (!existing || existing.deletedAt) return { ok: false };

  await prisma.$transaction(async (tx) => {
    // the old token dies now; his credential with it
    await tx.stemGuest.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), tokenExpiresAt: new Date() },
    });
    await tx.stemCredential.updateMany({
      where: { stemGuestId: existing.id },
      data: { status: "REVOKED" },
    });
    // paid? a human decides the refund — surfaced in the atelier, never silent
    if (existing.paymentStatus === "PAID") {
      await tx.auditLog.create({
        data: {
          actorId: ctx.user.id,
          action: "payment.refund.needed",
          entityType: "StemGuest",
          entityId: existing.id,
          after: { reason: "stem replaced after payment" },
        },
      });
    }
  });

  await audit(prisma, {
    action: "stem.replace",
    entityType: "StemGuest",
    entityId: existing.id,
    actorId: ctx.user.id,
  });

  revalidatePath(`/rose/stem/${eventId}`);
  return { ok: true };
}
