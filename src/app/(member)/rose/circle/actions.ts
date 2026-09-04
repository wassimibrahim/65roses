"use server";

// JOIN is the only thing that ever fetches the link, and it fetches it on the
// server at the moment she asks. It is not in the page's payload, not in the
// HTML, not in a prop, and not in the bundle.
import { requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { getSetting, GROUP_KEY, mayReceiveCircleLink } from "@/lib/settings";

export async function revealCircleLink(): Promise<{ link: string | null }> {
  const user = await requireVerifiedPhone();
  if (!user.memberId) return { link: null };

  const member = await prisma.memberProfile.findUnique({
    where: { id: user.memberId },
    select: { id: true, status: true, phoneVerified: true, communityStatus: true },
  });
  // the gate is here, on the server, not in whether a button was rendered
  if (!member || !mayReceiveCircleLink(member)) return { link: null };

  const link = await getSetting(prisma, GROUP_KEY.ROSES);
  if (!link) return { link: null };

  if (member.communityStatus === "NOT_INVITED") {
    await prisma.memberProfile.update({
      where: { id: member.id },
      data: { communityStatus: "INVITED", communityJoinedAt: new Date() },
    });
  }
  await audit(prisma, {
    action: "circle.link.reveal",
    entityType: "MemberProfile",
    entityId: member.id,
    actorId: user.id,
  });

  return { link };
}
