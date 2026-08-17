"use server";

// account creation from a welcome token — password, then the phone proves it's her.
// Every action re-validates the token server-side; the client is never trusted.
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/crypto/hash";
import { isCommonPassword } from "@/lib/auth/common-passwords";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { consume, presets } from "@/lib/rate-limit";
import { sendSMS } from "@/lib/providers/sms";
import { normalizePhone } from "@/lib/validation/apply";
import { copy, fill } from "@/content/copy";

async function tokenApplication(t: string) {
  const app = await prisma.application.findUnique({
    where: { welcomeToken: t },
    select: {
      id: true,
      phone: true,
      welcomeTokenExp: true,
      member: {
        select: {
          id: true,
          phone: true,
          user: { select: { id: true, email: true, passwordHash: true } },
        },
      },
    },
  });
  if (!app?.member || !app.welcomeTokenExp || app.welcomeTokenExp.getTime() < Date.now()) {
    return null;
  }
  return app;
}

async function ip(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function setPassword(input: {
  t: string;
  password: string;
  confirm: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = z
    .object({ t: z.string().min(1), password: z.string(), confirm: z.string() })
    .safeParse(input);
  if (!parsed.success) return { error: copy.errors.notFound };

  const app = await tokenApplication(parsed.data.t);
  if (!app) return { error: copy.errors.expired };

  const { password, confirm } = parsed.data;
  if (password.length < 10) return { error: copy.account.passwordShort };
  if (isCommonPassword(password)) return { error: copy.account.passwordCommon };
  if (password !== confirm) return { error: copy.account.passwordMismatch };

  await prisma.user.update({
    where: { id: app.member!.user.id },
    data: { passwordHash: await hashPassword(password) },
  });
  return { ok: true };
}

export async function sendCreateCode(input: {
  t: string;
  phone: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = z.object({ t: z.string().min(1), phone: z.string() }).safeParse(input);
  if (!parsed.success) return { error: copy.errors.notFound };

  const app = await tokenApplication(parsed.data.t);
  if (!app) return { error: copy.errors.expired };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: copy.apply.errors.phone };

  const byPhone = await consume(prisma, presets.otpPerPhone, phone);
  const byIp = await consume(prisma, presets.otpPerIp, await ip());
  if (!byPhone.allowed || !byIp.allowed) return { error: copy.errors.rateLimited };

  const { code } = await issueOtp(prisma, phone, "PHONE_VERIFY", {
    userId: app.member!.user.id,
    ip: await ip(),
  });
  await sendSMS(prisma, {
    to: phone,
    body: fill(copy.sms.otp, { code }),
    templateKey: "otp",
    memberId: app.member!.id,
  });
  return { ok: true };
}

export async function confirmCreateCode(input: {
  t: string;
  phone: string;
  code: string;
}): Promise<{ ok: true; email: string } | { error: string }> {
  const parsed = z
    .object({ t: z.string().min(1), phone: z.string(), code: z.string().length(6) })
    .safeParse(input);
  if (!parsed.success) return { error: copy.errors.wrongCode };

  const app = await tokenApplication(parsed.data.t);
  if (!app) return { error: copy.errors.expired };
  if (!app.member!.user.passwordHash) return { error: copy.errors.notFound };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: copy.apply.errors.phone };

  const verdict = await verifyOtp(prisma, phone, "PHONE_VERIFY", parsed.data.code);
  if (verdict === "EXPIRED") return { error: copy.errors.expired };
  if (verdict === "LOCKED") return { error: copy.errors.rateLimited };
  if (verdict !== "OK") return { error: copy.errors.wrongCode };

  // phone proven — verified, token consumed, one-time only
  await prisma.$transaction([
    prisma.memberProfile.update({
      where: { id: app.member!.id },
      data: { phone, phoneVerified: true, phoneVerifiedAt: new Date() },
    }),
    prisma.application.update({
      where: { id: app.id },
      data: { welcomeToken: null, welcomeTokenExp: null },
    }),
  ]);

  return { ok: true, email: app.member!.user.email };
}
