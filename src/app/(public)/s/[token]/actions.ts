"use server";

// his side of the night. The token is the only key; every action revalidates it.
// Amounts always come from the event — nothing the client sends is priced.
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { consume, presets } from "@/lib/rate-limit";
import { sendSMS } from "@/lib/providers/sms";
import { getPaymentProvider } from "@/lib/providers/payment";
import { hashCode } from "@/lib/crypto/hash";
import { ensureStemCredential } from "@/lib/stem-credential";
import { copy, fill } from "@/content/copy";

async function validStem(token: string) {
  const stem = await prisma.stemGuest.findUnique({
    where: { token },
    select: {
      id: true,
      eventId: true,
      firstName: true,
      phone: true,
      phoneVerified: true,
      paymentStatus: true,
      tokenExpiresAt: true,
      deletedAt: true,
      event: {
        select: { id: true, endsAt: true, stemPriceCents: true, stemCurrency: true },
      },
    },
  });
  if (!stem || stem.deletedAt) return null;
  if (stem.tokenExpiresAt && stem.tokenExpiresAt.getTime() < Date.now()) return null;
  if (stem.event.endsAt.getTime() < Date.now()) return null;
  return stem;
}

async function limited(token: string): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const byToken = await consume(prisma, presets.stemLinkPerToken, token);
  const byIp = await consume(prisma, presets.stemLinkPerIp, ip);
  return !byToken.allowed || !byIp.allowed;
}

export async function stemSendCode(input: {
  token: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { error: copy.errors.notFound };
  if (await limited(parsed.data.token)) return { error: copy.errors.rateLimited };

  const stem = await validStem(parsed.data.token);
  if (!stem) return { error: copy.errors.expired };

  const byPhone = await consume(prisma, presets.otpPerPhone, stem.phone);
  if (!byPhone.allowed) return { error: copy.errors.rateLimited };

  const { code } = await issueOtp(prisma, stem.phone, "STEM_VERIFY", {
    stemGuestId: stem.id,
    eventId: stem.eventId,
  });
  await sendSMS(prisma, {
    to: stem.phone,
    body: fill(copy.sms.otp, { code }),
    templateKey: "otp",
    eventId: stem.eventId,
    stemGuestId: stem.id,
  });
  return { ok: true };
}

export async function stemVerifyCode(input: {
  token: string;
  code: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = z
    .object({ token: z.string().min(1), code: z.string().length(6) })
    .safeParse(input);
  if (!parsed.success) return { error: copy.errors.wrongCode };
  if (await limited(parsed.data.token)) return { error: copy.errors.rateLimited };

  const stem = await validStem(parsed.data.token);
  if (!stem) return { error: copy.errors.expired };

  const verdict = await verifyOtp(prisma, stem.phone, "STEM_VERIFY", parsed.data.code);
  if (verdict === "EXPIRED") return { error: copy.errors.expired };
  if (verdict === "LOCKED") return { error: copy.errors.rateLimited };
  if (verdict !== "OK") return { error: copy.errors.wrongCode };

  await prisma.stemGuest.update({
    where: { id: stem.id },
    data: { phoneVerified: true },
  });
  return { ok: true };
}

export type IntentResult =
  | { free: true }
  | { clientSecret: string; providerRef: string; amountLabel: string }
  | { error: string };

export async function stemCreateIntent(input: { token: string }): Promise<IntentResult> {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { error: copy.errors.notFound };
  if (await limited(parsed.data.token)) return { error: copy.errors.rateLimited };

  const stem = await validStem(parsed.data.token);
  if (!stem) return { error: copy.errors.expired };
  if (!stem.phoneVerified) return { error: copy.errors.wrongCode };

  // free night: no payment, credential now
  if (stem.event.stemPriceCents === 0) {
    await prisma.$transaction(async (tx) => {
      await ensureStemCredential(tx, stem.id, stem.eventId);
      await tx.stemGuest.update({
        where: { id: stem.id },
        data: { paymentStatus: "NONE" },
      });
    });
    return { free: true };
  }

  // one intent per token+event, forever — replays return the same payment
  const idempotencyKey = hashCode(`${parsed.data.token}:${stem.eventId}`, "stem-payment");
  const providerKind =
    process.env.PAYMENT_PROVIDER === "stripe"
      ? "STRIPE"
      : process.env.PAYMENT_PROVIDER === "whish"
        ? "WHISH"
        : "STRIPE"; // console provider stands in for stripe in dev

  const intent = await getPaymentProvider().createIntent({
    amountCents: stem.event.stemPriceCents, // the event prices the night — never the client
    currency: stem.event.stemCurrency,
    idempotencyKey,
    metadata: { stemGuestId: stem.id, eventId: stem.eventId },
  });

  await prisma.payment.upsert({
    where: { idempotencyKey },
    create: {
      eventId: stem.eventId,
      stemGuestId: stem.id,
      provider: providerKind,
      providerRef: intent.providerRef,
      idempotencyKey,
      amountCents: stem.event.stemPriceCents,
      currency: stem.event.stemCurrency,
      status: "PENDING",
    },
    update: { providerRef: intent.providerRef },
  });
  await prisma.stemGuest.update({
    where: { id: stem.id },
    data: { paymentStatus: "PENDING" },
  });

  return {
    clientSecret: intent.clientSecret ?? "",
    providerRef: intent.providerRef,
    amountLabel: `${stem.event.stemPriceCents / 100} ${stem.event.stemCurrency}`,
  };
}
