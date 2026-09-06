"use server";

// referral review — INVITE mints a 14-day fast-track application link.
// The fast track skips nothing; it is only marked referred and surfaces first.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { opaqueToken } from "@/lib/crypto/token";

const INVITE_DAYS = 14;

async function actionContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

async function setStatus(
  formData: FormData,
  status: "INVITED" | "DECLINED" | "REVIEWING",
): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const id = z.string().min(1).parse(formData.get("id"));

  await prisma.referral.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      ...(status === "INVITED"
        ? {
            inviteToken: opaqueToken(16),
            inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
          }
        : {}),
    },
  });
  await audit(prisma, {
    action: `referral.${status.toLowerCase()}`,
    entityType: "Referral",
    entityId: id,
    actorId: admin.id,
    after: { status },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/referrals");
}

export async function inviteReferral(formData: FormData): Promise<void> {
  await setStatus(formData, "INVITED");
}

export async function declineReferral(formData: FormData): Promise<void> {
  await setStatus(formData, "DECLINED");
}

export async function reviewReferral(formData: FormData): Promise<void> {
  await setStatus(formData, "REVIEWING");
}
