"use server";

// forgot password — one answer for everyone: IF WE KNOW YOU, IT'S SENT.
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/crypto/hash";
import { isCommonPassword } from "@/lib/auth/common-passwords";
import { makeResetToken, parseResetToken } from "@/lib/auth/reset-token";
import { consume, presets } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/providers/email";
import { copy } from "@/content/copy";

export async function requestReset(input: { email: string }): Promise<{ done: true }> {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(input);
  // whatever happens, the answer is the same
  if (!parsed.success) return { done: true };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const byEmail = await consume(prisma, presets.loginPerEmail, parsed.data.email);
  const byIp = await consume(prisma, presets.otpPerIp, ip);
  if (!byEmail.allowed || !byIp.allowed) return { done: true };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return { done: true };

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/enter/reset?t=${makeResetToken(user.id)}`;
  await sendEmail(prisma, {
    msg: {
      to: parsed.data.email,
      subject: copy.email.applied.subject,
      text: [copy.account.yourNumberIsYours, url].join("\n"),
    },
    templateKey: "reset",
  }).catch(() => {});

  return { done: true };
}

export async function resetPassword(input: {
  t: string;
  password: string;
  confirm: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = z
    .object({ t: z.string().min(1), password: z.string(), confirm: z.string() })
    .safeParse(input);
  if (!parsed.success) return { error: copy.errors.expired };

  const userId = parseResetToken(parsed.data.t);
  if (!userId) return { error: copy.errors.expired };

  const { password, confirm } = parsed.data;
  if (password.length < 10) return { error: copy.account.passwordShort };
  if (isCommonPassword(password)) return { error: copy.account.passwordCommon };
  if (password !== confirm) return { error: copy.account.passwordMismatch };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null },
  });
  return { ok: true };
}
