// /rose/delivery — WHERE SHOULD YOUR ROSE FIND YOU?
// The address goes in encrypted and never comes back out to her. What returns
// is AREA, CITY — enough for her to recognise it, useless to anyone else.
import { redirect } from "next/navigation";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { DeliveryForm, type DeliveryView } from "./DeliveryForm";

export default async function DeliveryPage() {
  let memberId: string | undefined;
  let userId: string;
  try {
    const user = await requireVerifiedPhone();
    memberId = user.memberId;
    userId = user.id;
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") redirect("/enter");
    redirect("/enter/verify");
  }
  if (!memberId) redirect("/atelier");
  void userId;

  const member = await prisma.memberProfile.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      city: true,
      deliveryAddress: { select: { area: true, city: true } },
      roseDeliveries: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });

  const status = member.roseDeliveries[0]?.status;
  const view: DeliveryView = {
    where: member.deliveryAddress
      ? `${member.deliveryAddress.area}, ${member.deliveryAddress.city}`
      : null,
    onHerWay: status === "OUT_FOR_DELIVERY" || status === "PREPARING" || status === "READY",
    delivered: status === "DELIVERED",
    prefill: {
      recipientName: `${member.firstName} ${member.lastName}`,
      phone: member.phone,
      city: member.city,
    },
  };

  return <DeliveryForm view={view} />;
}
