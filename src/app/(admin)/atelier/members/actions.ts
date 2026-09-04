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

export async function pauseMember(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const id = z.string().min(1).parse(formData.get("id"));
  const member = await prisma.memberProfile.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!member) return;

  const next = member.status === "PAUSED" ? "ACTIVE" : "PAUSED";
  await prisma.memberProfile.update({
    where: { id },
    data: { status: next, statusChangedAt: new Date() },
  });
  await audit(prisma, {
    action: "member.status.change",
    entityType: "MemberProfile",
    entityId: id,
    actorId: admin.id,
    before: { status: member.status },
    after: { status: next },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/members");
}
