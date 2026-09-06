// OTP — 6 digits, 5-minute expiry, max 5 attempts, single use, hashed at rest.
// issue() returns the code for the caller to hand to the SMS provider; it is never stored plain.
// Rate limiting (per phone AND per ip) is enforced by callers via lib/rate-limit presets.
import { randomInt } from "node:crypto";
import type { VerificationPurpose } from "@prisma/client";
import { hashCode, verifyCode } from "@/lib/crypto/hash";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

// the slice of the Prisma client this module needs — tests pass an in-memory fake
export interface OtpDb {
  phoneVerification: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    findMany(args: unknown): Promise<
      {
        id: string;
        phone: string;
        codeHash: string;
        attempts: number;
        maxAttempts: number;
        expiresAt: Date;
        consumedAt: Date | null;
      }[]
    >;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

function context(phone: string, purpose: VerificationPurpose): string {
  return `otp:${purpose}:${phone}`;
}

export async function issueOtp(
  db: OtpDb,
  phone: string,
  purpose: VerificationPurpose,
  meta: { userId?: string; stemGuestId?: string; eventId?: string; ip?: string } = {},
): Promise<{ code: string }> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.phoneVerification.create({
    data: {
      phone,
      purpose,
      codeHash: hashCode(code, context(phone, purpose)),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      maxAttempts: OTP_MAX_ATTEMPTS,
      ...meta,
    },
  });
  return { code };
}

export type OtpVerdict = "OK" | "WRONG" | "EXPIRED" | "LOCKED" | "NONE";

export async function verifyOtp(
  db: OtpDb,
  phone: string,
  purpose: VerificationPurpose,
  code: string,
): Promise<OtpVerdict> {
  const candidates = await db.phoneVerification.findMany({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const row = candidates[0];
  if (!row) return "NONE";
  if (row.expiresAt.getTime() < Date.now()) return "EXPIRED";
  if (row.attempts >= row.maxAttempts) return "LOCKED";

  if (!verifyCode(code, context(phone, purpose), row.codeHash)) {
    await db.phoneVerification.update({
      where: { id: row.id },
      data: { attempts: row.attempts + 1 },
    });
    return row.attempts + 1 >= row.maxAttempts ? "LOCKED" : "WRONG";
  }

  // single use — consumed on success
  await db.phoneVerification.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return "OK";
}
