// GET /api/cron — the hourly pass. Vercel Cron calls it with the secret;
// nothing else can. It answers with counts and never with a name, a number,
// a phone or an address.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { runHourly } from "@/lib/jobs";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const offered = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return offered.length === expected.length && timingSafeEqual(offered, expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
  }

  const run = await runHourly(prisma);
  return NextResponse.json(run);
}
