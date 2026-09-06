"use server";

// member actions on her own page
import { revalidatePath } from "next/cache";
import { requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

export async function wakeMyRose(): Promise<void> {
  const user = await requireVerifiedPhone();
  if (!user.memberId) return;

  const member = await prisma.memberProfile.findUnique({
    where: { id: user.memberId },
    select: { id: true, status: true, wakeRequestedAt: true },
  });
  if (!member || (member.status !== "QUIET" && member.status !== "AT_RISK")) return;
  if (member.wakeRequestedAt) return; // asked once already — the atelier has her

  await prisma.memberProfile.update({
    where: { id: member.id },
    data: { wakeRequestedAt: new Date() },
  });
  await audit(prisma, {
    action: "member.wake.request",
    entityType: "MemberProfile",
    entityId: member.id,
    actorId: user.id,
  });
  revalidatePath("/rose");
}
