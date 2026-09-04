"use server";

// Moving a Rose toward her. Every read of an address and every status change
// writes a row; a failure needs a reason typed by a person.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireAdmin, requireOwner } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";
import { sendSMS } from "@/lib/providers/sms";
import { opaqueToken } from "@/lib/crypto/token";

// the order a Rose travels in. ADVANCE moves one step along it.
const ORDER: DeliveryStatus[] = [
  "PENDING_ADDRESS",
  "ADDRESS_RECEIVED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const STAMP: Partial<Record<DeliveryStatus, string>> = {
  PREPARING: "preparedAt",
  OUT_FOR_DELIVERY: "dispatchedAt",
  DELIVERED: "deliveredAt",
};

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
 * On DELIVERED the object becomes hers: the credential goes ACTIVE with an
 * issue date, and she gets one line. Idempotent — a second DELIVERED does
 * nothing and sends nothing.
 */
async function onDelivered(memberId: string, deliveryId: string, actorId: string) {
  const member = await prisma.memberProfile.findUniqueOrThrow({
    where: { id: memberId },
    select: { id: true, phone: true, memberNumber: true, roseCredential: { select: { id: true } } },
  });

  if (member.roseCredential) {
    await prisma.roseCredential.update({
      where: { id: member.roseCredential.id },
      data: { status: "ACTIVE", issuedAt: new Date() },
    });
  }

  const told = await prisma.messageLog.count({
    where: { memberId, templateKey: "delivered", status: { not: "FAILED" } },
  });
  if (told === 0) {
    await sendSMS(prisma, {
      to: member.phone,
      body: copy.sms.delivered,
      templateKey: "delivered",
      memberId,
    }).catch(() => {});
  }

  await audit(prisma, {
    action: "delivery.delivered",
    entityType: "RoseDelivery",
    entityId: deliveryId,
    actorId,
    after: { memberNumber: member.memberNumber },
  });
}

export async function advanceDeliveries(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const ids = z.array(z.string().min(1)).min(1).parse(formData.getAll("ids"));

  const rows = await prisma.roseDelivery.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, memberId: true },
  });

  for (const row of rows) {
    const at = ORDER.indexOf(row.status);
    const next = at >= 0 && at < ORDER.length - 1 ? ORDER[at + 1] : null;
    // a Rose with no address cannot be prepared — she has not told us where
    if (!next || row.status === "PENDING_ADDRESS") continue;

    const stamp = STAMP[next];
    await prisma.roseDelivery.update({
      where: { id: row.id },
      data: { status: next, ...(stamp ? { [stamp]: new Date() } : {}) },
    });
    await audit(prisma, {
      action: "delivery.status.change",
      entityType: "RoseDelivery",
      entityId: row.id,
      actorId: admin.id,
      before: { status: row.status },
      after: { status: next },
      ip,
      userAgent,
    });
    if (next === "DELIVERED") await onDelivered(row.memberId, row.id, admin.id);
  }

  revalidatePath("/atelier/deliveries");
}

export async function failDelivery(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({ id: z.string().min(1), reason: z.string().trim().min(3).max(300) })
    .parse({ id: formData.get("id"), reason: formData.get("reason") });

  const before = await prisma.roseDelivery.findUniqueOrThrow({
    where: { id: input.id },
    select: { status: true },
  });
  await prisma.roseDelivery.update({
    where: { id: input.id },
    data: { status: "FAILED", failedAt: new Date(), failureReason: input.reason },
  });
  await audit(prisma, {
    action: "delivery.failed",
    entityType: "RoseDelivery",
    entityId: input.id,
    actorId: admin.id,
    before,
    after: { status: "FAILED", reason: input.reason },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/deliveries");
}

export async function setCourier(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      id: z.string().min(1),
      courier: z.string().trim().max(80).optional().default(""),
      trackingRef: z.string().trim().max(120).optional().default(""),
    })
    .parse({
      id: formData.get("id"),
      courier: formData.get("courier"),
      trackingRef: formData.get("trackingRef"),
    });

  await prisma.roseDelivery.update({
    where: { id: input.id },
    data: { courier: input.courier || null, trackingRef: input.trackingRef || null },
  });
  await audit(prisma, {
    action: "delivery.courier.set",
    entityType: "RoseDelivery",
    entityId: input.id,
    actorId: admin.id,
    after: { courier: input.courier, trackingRef: input.trackingRef },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/deliveries");
}

/**
 * A Rose is replaced, never reissued: the same engraved number, a new object,
 * the old credential revoked so its NFC and QR stop answering. The physical
 * Rose in her drawer is never asked for. Owner only, with a reason and a note.
 *
 * On the lineage: RoseCredential.memberId is unique, so a member can hold only
 * one credential row and the replaces/replacedBy self-relation cannot hold both
 * halves of a replacement. Rather than quietly drop the old object's history,
 * the row is re-cut in place and the audit entry carries the old serial and
 * NFC — the trail is the lineage, and it is the copy that cannot be edited.
 */
export async function replaceRose(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const h = await headers();
  const input = z
    .object({
      memberId: z.string().min(1),
      reason: z.enum(["THEFT", "DAMAGE", "SAFETY"]),
      note: z.string().trim().min(3).max(300),
    })
    .parse({
      memberId: formData.get("memberId"),
      reason: formData.get("reason"),
      note: formData.get("note"),
    });

  const old = await prisma.roseCredential.findUnique({
    where: { memberId: input.memberId },
    select: { id: true, engravedNumber: true, serial: true, nfcUid: true },
  });
  if (!old) return;

  const serial = `${old.serial}-R${Date.now().toString(36)}`;

  await prisma.$transaction(async (tx) => {
    await tx.roseCredential.update({
      where: { id: old.id },
      data: {
        // the engraved number is hers forever and is not touched here
        serial,
        // the old QR and NFC stop answering the moment this is approved
        qrToken: opaqueToken(16),
        nfcUid: null,
        status: "ASSIGNED",
        madeAt: null,
        issuedAt: null,
        replacementReason: input.reason,
        replacementApprovedBy: owner.id,
      },
    });
    await tx.roseDelivery.create({
      data: { memberId: input.memberId, status: "PENDING_ADDRESS" },
    });
  });

  await audit(prisma, {
    action: "rose.replace",
    entityType: "RoseCredential",
    entityId: old.id,
    actorId: owner.id,
    before: { serial: old.serial, nfcUid: old.nfcUid, engravedNumber: old.engravedNumber },
    after: {
      serial,
      reason: input.reason,
      note: input.note,
      engravedNumber: old.engravedNumber,
    },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  });

  revalidatePath("/atelier/deliveries");
}
