// argon2id for passwords; peppered HMAC-SHA256 for short codes (OTP, door codes).
// Short codes must never go through a plain fast hash, and never argon2 either —
// a 4–6 digit space is brute-forceable offline regardless, so the pepper is the defense.
import { createHmac, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

function pepper(): string {
  const value = process.env.CODE_HASH_PEPPER;
  if (!value) throw new Error("CODE_HASH_PEPPER is not set");
  return value;
}

// context binds a code to its use, e.g. "otp:PHONE_VERIFY:+9613..." or "door:evt_x:member_y"
export function hashCode(code: string, context: string): string {
  return createHmac("sha256", pepper()).update(`${context}:${code}`).digest("hex");
}

export function verifyCode(code: string, context: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashCode(code, context), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
