"use server";

// Rotating a link kills the old one. That is the whole point of the feature —
// a WhatsApp invite that has left the room can only be answered by replacing
// it — so the rotation is audited with who did it and which group.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { GROUP_KEY, setSetting, type CircleGroup } from "@/lib/settings";

async function actionContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function rotateCircleLink(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      group: z.enum(["ANNOUNCEMENTS", "ROSES"]),
      link: z.string().trim().url().max(500),
    })
    .parse({ group: formData.get("group"), link: formData.get("link") });

  const key = GROUP_KEY[input.group as CircleGroup];
  await setSetting(prisma, key, input.link, admin.id);

  // the link itself is not written to the trail — the fact of the rotation is
  await audit(prisma, {
    action: "circle.link.rotate",
    entityType: "Setting",
    entityId: key,
    actorId: admin.id,
    after: { group: input.group },
    ip,
    userAgent,
  });

  revalidatePath("/atelier/circle");
}

export async function setCommunityStatus(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      id: z.string().min(1),
      status: z.enum(["NOT_INVITED", "INVITED", "JOINED", "LEFT", "REMOVED"]),
    })
    .parse({ id: formData.get("id"), status: formData.get("status") });

  const before = await prisma.memberProfile.findUnique({
    where: { id: input.id },
    select: { communityStatus: true },
  });
  if (!before) return;

  await prisma.memberProfile.update({
    where: { id: input.id },
    data: {
      communityStatus: input.status,
      ...(input.status === "JOINED" ? { communityJoinedAt: new Date() } : {}),
    },
  });
  await audit(prisma, {
    action: "circle.status.change",
    entityType: "MemberProfile",
    entityId: input.id,
    actorId: admin.id,
    before,
    after: { communityStatus: input.status },
    ip,
    userAgent,
  });

  revalidatePath("/atelier/circle");
}
