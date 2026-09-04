"use server";

// Binding a tag to an object. Typed or scanned — a USB reader types into the
// same field. A uid is unique across both credential kinds, so binding one
// that is already spoken for is refused rather than silently moved.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { normalizeUid } from "@/lib/door/nfc";

async function actionContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function bindNfc(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      subject: z.enum(["ROSE", "STEM"]),
      id: z.string().min(1),
      uid: z.string().min(4).max(64),
    })
    .parse({
      subject: formData.get("subject"),
      id: formData.get("id"),
      uid: formData.get("uid"),
    });

  const nfcUid = normalizeUid(input.uid);
  if (nfcUid.length < 8) return;

  // one tag, one object — never quietly reassigned off something else
  const [takenByRose, takenByStem] = await Promise.all([
    prisma.roseCredential.findUnique({ where: { nfcUid }, select: { id: true, memberId: true } }),
    prisma.stemCredential.findUnique({ where: { nfcUid }, select: { id: true } }),
  ]);

  if (input.subject === "ROSE") {
    if (takenByStem || (takenByRose && takenByRose.memberId !== input.id)) return;
    await prisma.roseCredential.update({
      where: { memberId: input.id },
      data: { nfcUid },
    });
  } else {
    if (takenByRose) return;
    const existing = await prisma.stemCredential.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing || (takenByStem && takenByStem.id !== input.id)) return;
    await prisma.stemCredential.update({ where: { id: input.id }, data: { nfcUid } });
  }

  await audit(prisma, {
    action: "nfc.bind",
    entityType: input.subject === "ROSE" ? "RoseCredential" : "StemCredential",
    entityId: input.id,
    actorId: admin.id,
    // the uid identifies a physical object; only its tail goes in the trail
    after: { subject: input.subject, uidTail: nfcUid.slice(-4) },
    ip,
    userAgent,
  });

  revalidatePath("/atelier/nfc");
}

export async function unbindNfc(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({ subject: z.enum(["ROSE", "STEM"]), id: z.string().min(1) })
    .parse({ subject: formData.get("subject"), id: formData.get("id") });

  if (input.subject === "ROSE") {
    await prisma.roseCredential.update({ where: { id: input.id }, data: { nfcUid: null } });
  } else {
    await prisma.stemCredential.update({ where: { id: input.id }, data: { nfcUid: null } });
  }

  await audit(prisma, {
    action: "nfc.unbind",
    entityType: input.subject === "ROSE" ? "RoseCredential" : "StemCredential",
    entityId: input.id,
    actorId: admin.id,
    ip,
    userAgent,
  });

  revalidatePath("/atelier/nfc");
}
