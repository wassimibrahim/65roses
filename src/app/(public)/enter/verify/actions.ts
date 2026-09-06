"use server";

// the OTP step for login — a member session is not fully hers until the phone answers
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { consume, presets } from "@/lib/rate-limit";
import { sendSMS } from "@/lib/providers/sms";
import { copy, fill } from "@/content/copy";

async function memberFromSession() {
  const session = await auth();
  const memberId = session?.user?.memberId;
  if (!memberId) return null;
  return prisma.memberProfile.findUnique({
    where: { id: memberId },
    select: { id: true, phone: true, phoneVerified: true, userId: true },
  });
}

export async function sendLoginCode(): Promise<{ ok: true } | { error: string }> {
  const member = await memberFromSession();
  if (!member) return { error: copy.errors.notFound };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const byPhone = await consume(prisma, presets.otpPerPhone, member.phone);
  const byIp = await consume(prisma, presets.otpPerIp, ip);
  if (!byPhone.allowed || !byIp.allowed) return { error: copy.errors.rateLimited };

  const { code } = await issueOtp(prisma, member.phone, "LOGIN", {
    userId: member.userId,
    ip,
  });
  await sendSMS(prisma, {
    to: member.phone,
    body: fill(copy.sms.otp, { code }),
    templateKey: "otp",
    memberId: member.id,
  });
  return { ok: true };
}

export async function confirmLoginCode(input: {
  code: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = z.object({ code: z.string().length(6) }).safeParse(input);
  if (!parsed.success) return { error: copy.errors.wrongCode };

  const member = await memberFromSession();
  if (!member) return { error: copy.errors.notFound };

  const verdict = await verifyOtp(prisma, member.phone, "LOGIN", parsed.data.code);
  if (verdict === "EXPIRED") return { error: copy.errors.expired };
  if (verdict === "LOCKED") return { error: copy.errors.rateLimited };
  if (verdict !== "OK") return { error: copy.errors.wrongCode };

  if (!member.phoneVerified) {
    await prisma.memberProfile.update({
      where: { id: member.id },
      data: { phoneVerified: true, phoneVerifiedAt: new Date() },
    });
  }
  return { ok: true };
}
