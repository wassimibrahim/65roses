// otp: issue/verify, single use, expiry, attempt lockout — against an in-memory fake db
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import type { OtpDb } from "./index";

beforeAll(() => {
  process.env.CODE_HASH_PEPPER = randomBytes(32).toString("base64");
});

interface Row {
  id: string;
  phone: string;
  purpose: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

function fakeDb(): OtpDb & { rows: Row[] } {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    phoneVerification: {
      async create({ data }) {
        const row: Row = {
          id: `pv_${++seq}`,
          attempts: 0,
          consumedAt: null,
          createdAt: new Date(),
          ...(data as Omit<Row, "id" | "attempts" | "consumedAt" | "createdAt">),
        };
        rows.push(row);
        return { id: row.id };
      },
      async findMany(args) {
        const { where } = args as {
          where: { phone: string; purpose: string; consumedAt: null };
        };
        return rows
          .filter(
            (r) => r.phone === where.phone && r.purpose === where.purpose && r.consumedAt === null,
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 1);
      },
      async update({ where, data }) {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return { id: row.id };
      },
    },
  };
}

const PHONE = "+9613123456";

describe("otp", () => {
  let db: ReturnType<typeof fakeDb>;

  beforeEach(() => {
    db = fakeDb();
    vi.useRealTimers();
  });

  it("issues a 6-digit code and verifies it once only", async () => {
    const { issueOtp, verifyOtp } = await import("./index");
    const { code } = await issueOtp(db, PHONE, "PHONE_VERIFY");
    expect(code).toMatch(/^\d{6}$/);
    expect(db.rows[0]!.codeHash).not.toContain(code); // hashed at rest

    expect(await verifyOtp(db, PHONE, "PHONE_VERIFY", code)).toBe("OK");
    // single use — the same code is dead now
    expect(await verifyOtp(db, PHONE, "PHONE_VERIFY", code)).toBe("NONE");
  });

  it("rejects a wrong code and counts the attempt", async () => {
    const { issueOtp, verifyOtp } = await import("./index");
    const { code } = await issueOtp(db, PHONE, "PHONE_VERIFY");
    expect(await verifyOtp(db, PHONE, "PHONE_VERIFY", "000000")).not.toBe("OK");
    expect(db.rows[0]!.attempts).toBe(1);
    expect(await verifyOtp(db, PHONE, "PHONE_VERIFY", code)).toBe("OK");
  });

  it("locks after max attempts", async () => {
    const { issueOtp, verifyOtp, OTP_MAX_ATTEMPTS } = await import("./index");
    const { code } = await issueOtp(db, PHONE, "PHONE_VERIFY");
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      await verifyOtp(db, PHONE, "PHONE_VERIFY", "999999");
    }
    // even the right code is refused after lockout
    expect(await verifyOtp(db, PHONE, "PHONE_VERIFY", code)).toBe("LOCKED");
  });

  it("expires after five minutes", async () => {
    vi.useFakeTimers();
    const { issueOtp, verifyOtp, OTP_TTL_MS } = await import("./index");
    const { code } = await issueOtp(db, PHONE, "PHONE_VERIFY");
    vi.advanceTimersByTime(OTP_TTL_MS + 1000);
    expect(await verifyOtp(db, PHONE, "PHONE_VERIFY", code)).toBe("EXPIRED");
  });

  it("scopes codes to their purpose", async () => {
    const { issueOtp, verifyOtp } = await import("./index");
    const { code } = await issueOtp(db, PHONE, "PHONE_VERIFY");
    expect(await verifyOtp(db, PHONE, "LOGIN", code)).toBe("NONE");
  });
});
