// fixed-window rate limiting backed by the RateLimit table.
// consume() answers one question: is this action still allowed right now?
export interface RateLimitDb {
  rateLimit: {
    findUnique(args: {
      where: { key: string };
    }): Promise<{ key: string; count: number; windowEnd: Date } | null>;
    upsert(args: {
      where: { key: string };
      create: { key: string; count: number; windowEnd: Date };
      update: { count?: number | { increment: number }; windowEnd?: Date };
    }): Promise<{ count: number; windowEnd: Date }>;
  };
}

export interface RateLimitPreset {
  name: string;
  limit: number;
  windowMs: number;
}

const MIN = 60_000;

export const presets = {
  otpPerPhone: { name: "otp-phone", limit: 3, windowMs: 15 * MIN },
  otpPerIp: { name: "otp-ip", limit: 10, windowMs: 60 * MIN },
  applyPerIp: { name: "apply-ip", limit: 3, windowMs: 24 * 60 * MIN },
  applyPerEmail: { name: "apply-email", limit: 3, windowMs: 24 * 60 * MIN },
  loginPerEmail: { name: "login-email", limit: 5, windowMs: 15 * MIN },
  stemLinkPerToken: { name: "stem-link", limit: 20, windowMs: 60 * MIN },
  stemLinkPerIp: { name: "stem-link-ip", limit: 30, windowMs: 60 * MIN },
} as const satisfies Record<string, RateLimitPreset>;

export async function consume(
  db: RateLimitDb,
  preset: RateLimitPreset,
  id: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `${preset.name}:${id}`;
  const existing = await db.rateLimit.findUnique({ where: { key } });

  if (!existing || existing.windowEnd.getTime() <= now.getTime()) {
    const windowEnd = new Date(now.getTime() + preset.windowMs);
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowEnd },
      update: { count: 1, windowEnd },
    });
    return { allowed: true, remaining: preset.limit - 1 };
  }

  const updated = await db.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, windowEnd: new Date(now.getTime() + preset.windowMs) },
    update: { count: { increment: 1 } },
  });
  return {
    allowed: updated.count <= preset.limit,
    remaining: Math.max(0, preset.limit - updated.count),
  };
}
