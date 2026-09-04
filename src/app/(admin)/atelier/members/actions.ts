"use server";

// Waking a Rose is a decision a person makes, not a threshold that expires.
//
// Approval forgives: the no-shows still in her window become EXCUSED, so the
// recompute lifts her honestly instead of us pinning a number on top of a
// history that would immediately pull her back down. The audit row keeps the
// truth of what was forgiven, and by whom.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";
import { sendSMS } from "@/lib/providers/sms";
import { recomputeRoseHealth } from "@/lib/rose-health";
import { HISTORY_WINDOW } from "@/lib/rose-health/weights";

async function actionContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function approveWake(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const id = z.string().min(1).parse(formData.get("id"));

  const member = await prisma.memberProfile.findUnique({
    where: { id },
    select: { id: true, phone: true, status: true, roseHealth: true, wakeRequestedAt: true },
  });
  if (!member || !member.wakeRequestedAt) return;

  const forgiven = await prisma.rsvp.findMany({
    where: { memberId: id, outcome: "NO_SHOW" },
    orderBy: { event: { startsAt: "desc" } },
    take: HISTORY_WINDOW,
    select: { id: true },
  });

  await prisma.rsvp.updateMany({
    where: { id: { in: forgiven.map((r) => r.id) } },
    data: { outcome: "EXCUSED" },
  });

  // PAUSED and the rest are manual, and a wake is exactly the manual act that
  // undoes them — clear the status first, then let the history speak
  await prisma.memberProfile.update({
    where: { id },
    data: { status: "ACTIVE", wakeRequestedAt: null, statusChangedAt: new Date() },
  });
  const result = await recomputeRoseHealth(prisma, id);

  await audit(prisma, {
    action: "member.wake.approve",
    entityType: "MemberProfile",
    entityId: id,
    actorId: admin.id,
    before: { status: member.status, roseHealth: member.roseHealth },
    after: { status: result?.status, roseHealth: result?.score, excused: forgiven.length },
    ip,
    userAgent,
  });

  await sendSMS(prisma, {
    to: member.phone,
    body: copy.sms.awakeAgain,
    templateKey: "awake_again",
    memberId: id,
  }).catch(() => {
    // she is awake either way; the MessageLog row carries the failure
  });

  revalidatePath("/atelier/members");
}

export async function dismissWake(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const id = z.string().min(1).parse(formData.get("id"));

  await prisma.memberProfile.update({ where: { id }, data: { wakeRequestedAt: null } });
  await audit(prisma, {
    action: "member.wake.dismiss",
    entityType: "MemberProfile",
    entityId: id,
    actorId: admin.id,
    ip,
    userAgent,
  });
  // she is told nothing. Silence is the answer, not a rejection notice.
  revalidatePath("/atelier/members");
}

/**
 * Bulk status change from the list. PAUSED and the rest are exactly the
 * statuses a computation may never set, which is why a person sets them here.
 */
export async function setMemberStatus(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      ids: z.array(z.string().min(1)).min(1),
      status: z.enum(["ACTIVE", "QUIET", "AT_RISK", "PAUSED", "SUSPENDED", "INACTIVE"]),
    })
    .parse({ ids: formData.getAll("ids"), status: formData.get("status") });

  const before = await prisma.memberProfile.findMany({
    where: { id: { in: input.ids } },
    select: { id: true, status: true },
  });

  await prisma.memberProfile.updateMany({
    where: { id: { in: input.ids } },
    data: { status: input.status, statusChangedAt: new Date() },
  });

  for (const row of before) {
    await audit(prisma, {
      action: "member.status.change",
      entityType: "MemberProfile",
      entityId: row.id,
      actorId: admin.id,
      before: { status: row.status },
      after: { status: input.status },
      ip,
      userAgent,
    });
  }

  revalidatePath("/atelier/members");
}

/**
 * A manual adjustment to her standing. It needs a reason, and the reason is
 * kept — a number moved by a person without one is indistinguishable from a bug.
 */
export async function adjustRoseHealth(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      id: z.string().min(1),
      delta: z.coerce.number().int().min(-100).max(100),
      reason: z.string().trim().min(3).max(300),
    })
    .parse({
      id: formData.get("id"),
      delta: formData.get("delta"),
      reason: formData.get("reason"),
    });

  const member = await prisma.memberProfile.findUnique({
    where: { id: input.id },
    select: { roseHealth: true, status: true },
  });
  if (!member) return;

  const next = Math.max(0, Math.min(100, member.roseHealth + input.delta));
  await prisma.memberProfile.update({
    where: { id: input.id },
    data: { roseHealth: next, roseHealthAt: new Date() },
  });
  await audit(prisma, {
    action: "member.health.adjust",
    entityType: "MemberProfile",
    entityId: input.id,
    actorId: admin.id,
    before: { roseHealth: member.roseHealth },
    after: { roseHealth: next, delta: input.delta, reason: input.reason },
    ip,
    userAgent,
  });

  revalidatePath(`/atelier/members/${input.id}`);
}

export async function addMemberNote(formData: FormData): Promise<void> {
  const { admin } = await actionContext();
  const input = z
    .object({ id: z.string().min(1), body: z.string().trim().min(1).max(2000) })
    .parse({ id: formData.get("id"), body: formData.get("body") });

  await prisma.adminNote.create({
    data: { memberId: input.id, body: input.body, authorId: admin.id },
  });
  await audit(prisma, {
    action: "member.note.add",
    entityType: "MemberProfile",
    entityId: input.id,
    actorId: admin.id,
  });
  revalidatePath(`/atelier/members/${input.id}`);
}

/**
 * Bulk invite from the list. It delegates to the event's own send so the
 * invitable-status guard and the one-invitation-per-Rose constraint are the
 * same ones the events page uses — there is no second path into an invitation.
 */
export async function inviteMembers(formData: FormData): Promise<void> {
  const ids = formData.getAll("ids");
  const eventId = formData.get("inviteEventId");
  if (!eventId || ids.length === 0) return;

  const forward = new FormData();
  forward.set("eventId", eventId);
  for (const id of ids) forward.append("memberIds", id);

  const { sendInvitations } = await import("../events/actions");
  await sendInvitations(forward);
  revalidatePath("/atelier/members");
}
