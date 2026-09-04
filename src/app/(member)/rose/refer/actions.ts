"use server";

// KNOW A ROSE? — she gives us an @ and never hears about it again.
// Duplicates and rate limits get the same quiet answer as everything else.
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { consume, presets } from "@/lib/rate-limit";
import { normalizeInstagram } from "@/lib/validation/apply";

export async function submitReferral(input: {
  handle: string;
  note: string;
}): Promise<{ done: true }> {
  const user = await requireVerifiedPhone();
  if (!user.memberId) return { done: true };

  const parsed = z
    .object({ handle: z.string().trim().min(2).max(40), note: z.string().trim().max(200) })
    .safeParse(input);
  if (!parsed.success) return { done: true };

  const handle = normalizeInstagram(parsed.data.handle);
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return { done: true };

  const limit = await consume(prisma, presets.referPerMember, user.memberId);
  if (!limit.allowed) return { done: true };

  try {
    await prisma.referral.create({
      data: {
        authorMemberId: user.memberId,
        instagramHandle: handle,
        note: parsed.data.note || null,
      },
    });
  } catch (err) {
    // one submission per handle per member — a repeat learns nothing
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }

  return { done: true };
}
