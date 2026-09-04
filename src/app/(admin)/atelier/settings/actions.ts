"use server";

// Owner-only. Everything here changes the world for everyone, so every write
// is audited and the sequence can only ever move forward.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireOwner } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { setSetting, SETTING_KEYS, type SettingKey } from "@/lib/settings";
import { TEXT_KEYS } from "./keys";

async function owner() {
  const user = await requireOwner();
  const h = await headers();
  return {
    user,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function saveText(formData: FormData): Promise<void> {
  const { user, ip, userAgent } = await owner();
  const input = z
    .object({
      key: z.enum([
        TEXT_KEYS.houseRules,
        TEXT_KEYS.privacy,
        TEXT_KEYS.terms,
        TEXT_KEYS.cities,
        SETTING_KEYS.circleAnnouncements,
        SETTING_KEYS.circleRoses,
      ]),
      value: z.string().trim().max(20000),
    })
    .parse({ key: formData.get("key"), value: formData.get("value") });

  await setSetting(prisma, input.key as SettingKey, input.value, user.id);
  await audit(prisma, {
    action: "settings.change",
    entityType: "Setting",
    entityId: input.key,
    actorId: user.id,
    // the value is not written to the trail: one of these keys is a live invite link
    after: { key: input.key, length: input.value.length },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/settings");
}

/**
 * The member number sequence. It only ever moves forward — a number that has
 * been given out is hers forever, and rewinding would hand it to someone else.
 */
export async function setSequence(formData: FormData): Promise<void> {
  const { user, ip, userAgent } = await owner();
  const next = z.coerce.number().int().min(1).max(9999).parse(formData.get("next"));

  const current = await prisma.memberNumberSequence.findUnique({ where: { id: 1 } });
  const from = current?.current ?? 64;
  if (next - 1 <= from) return;

  await prisma.memberNumberSequence.upsert({
    where: { id: 1 },
    create: { id: 1, current: next - 1 },
    update: { current: next - 1 },
  });
  await audit(prisma, {
    action: "settings.sequence",
    entityType: "MemberNumberSequence",
    entityId: "1",
    actorId: user.id,
    before: { current: from },
    after: { current: next - 1 },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/settings");
}
