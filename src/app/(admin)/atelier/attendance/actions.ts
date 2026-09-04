"use server";

// Settling a night by hand. The hourly job does this on its own; this is for
// the morning when someone looks at the list and knows something the door did
// not — she was there, we just never scanned her.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { recomputeRoseHealth } from "@/lib/rose-health";

async function actionContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

/**
 * Everyone who confirmed and never came through the door becomes a no-show.
 * Only after the doors have closed — marking a night that is still running
 * would brand a Rose who is on her way.
 */
export async function markNoShows(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const eventId = z.string().min(1).parse(formData.get("eventId"));

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { id: true, endsAt: true },
  });
  if (event.endsAt.getTime() > Date.now()) return;

  const absent = await prisma.rsvp.findMany({
    where: { eventId, response: "CONFIRMED", checkInId: null, outcome: { not: "NO_SHOW" } },
    select: { id: true, memberId: true, outcome: true },
  });

  await prisma.rsvp.updateMany({
    where: { id: { in: absent.map((r) => r.id) } },
    data: { outcome: "NO_SHOW" },
  });

  for (const row of absent) {
    await audit(prisma, {
      action: "attendance.no_show",
      entityType: "Rsvp",
      entityId: row.id,
      actorId: admin.id,
      before: { outcome: row.outcome },
      after: { outcome: "NO_SHOW" },
      ip,
      userAgent,
    });
    await recomputeRoseHealth(prisma, row.memberId);
  }

  revalidatePath(`/atelier/attendance?event=${eventId}`);
}

/**
 * Reversing one. Needs a reason, because "she was here, the door was busy" is
 * the difference between a no-show and an administrative accident.
 */
export async function undoNoShow(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      id: z.string().min(1),
      reason: z.string().trim().min(3).max(300),
    })
    .parse({ id: formData.get("id"), reason: formData.get("reason") });

  const rsvp = await prisma.rsvp.findUnique({
    where: { id: input.id },
    select: { id: true, eventId: true, memberId: true, outcome: true },
  });
  if (!rsvp) return;

  await prisma.rsvp.update({
    where: { id: rsvp.id },
    data: { outcome: "ATTENDED" },
  });
  await audit(prisma, {
    action: "attendance.no_show.undo",
    entityType: "Rsvp",
    entityId: rsvp.id,
    actorId: admin.id,
    before: { outcome: rsvp.outcome },
    after: { outcome: "ATTENDED", reason: input.reason },
    ip,
    userAgent,
  });
  await recomputeRoseHealth(prisma, rsvp.memberId);

  revalidatePath(`/atelier/attendance?event=${rsvp.eventId}`);
}
