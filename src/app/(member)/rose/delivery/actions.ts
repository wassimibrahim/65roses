"use server";

// She tells us once where the Rose should find her. After that she is shown
// AREA, CITY and nothing more — the line itself is encrypted and does not come
// back to her screen. EDIT replaces it; it never reveals it.
import { revalidatePath } from "next/cache";
import { requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { deliverySchema, type DeliveryInput } from "@/lib/validation/delivery";

export async function saveDeliveryAddress(input: DeliveryInput): Promise<{ ok: boolean }> {
  const user = await requireVerifiedPhone();
  if (!user.memberId) return { ok: false };

  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const data = parsed.data;

  const existing = await prisma.deliveryAddress.findUnique({
    where: { memberId: user.memberId },
    select: { id: true },
  });

  await prisma.deliveryAddress.upsert({
    where: { memberId: user.memberId },
    create: {
      memberId: user.memberId,
      recipientName: data.recipientName,
      phone: data.phone,
      city: data.city,
      area: data.area,
      addressLine: data.addressLine,
      notes: data.notes || null,
    },
    update: {
      recipientName: data.recipientName,
      phone: data.phone,
      city: data.city,
      area: data.area,
      addressLine: data.addressLine,
      notes: data.notes || null,
    },
  });

  // the delivery moves off PENDING_ADDRESS the moment we know where to go
  const delivery = await prisma.roseDelivery.findFirst({
    where: { memberId: user.memberId, status: { notIn: ["DELIVERED", "RETURNED"] } },
    select: { id: true, status: true },
  });
  if (delivery) {
    if (delivery.status === "PENDING_ADDRESS") {
      await prisma.roseDelivery.update({
        where: { id: delivery.id },
        data: { status: "ADDRESS_RECEIVED" },
      });
    }
  } else {
    await prisma.roseDelivery.create({
      data: { memberId: user.memberId, status: "ADDRESS_RECEIVED" },
    });
  }

  // the address itself is never written to the trail — only that she set one
  await audit(prisma, {
    action: existing ? "delivery.address.update" : "delivery.address.create",
    entityType: "DeliveryAddress",
    entityId: user.memberId,
    actorId: user.id,
    after: { city: data.city, area: data.area },
  });

  revalidatePath("/rose/delivery");
  revalidatePath("/rose");
  return { ok: true };
}
