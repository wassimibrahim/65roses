// stateless signed reset tokens — base64url(userId.exp).hmac, one hour, no table
import { createHmac, timingSafeEqual } from "node:crypto";

const RESET_TTL_MS = 60 * 60 * 1000;

function pepper(): string {
  const value = process.env.CODE_HASH_PEPPER;
  if (!value) throw new Error("CODE_HASH_PEPPER is not set");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", pepper()).update(`reset:${payload}`).digest("base64url");
}

export function makeResetToken(userId: string, now: number = Date.now()): string {
  const payload = Buffer.from(`${userId}.${now + RESET_TTL_MS}`).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseResetToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const at = decoded.lastIndexOf(".");
  const userId = decoded.slice(0, at);
  const exp = Number(decoded.slice(at + 1));
  if (!userId || !Number.isFinite(exp) || exp < Date.now()) return null;
  return userId;
}
