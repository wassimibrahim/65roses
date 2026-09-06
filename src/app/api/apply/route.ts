// POST /api/apply — zod-validated, rate limited by IP and email, silent on duplicates
// and on bots. The response never reveals whether an email or handle already exists.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { applySchema } from "@/lib/validation/apply";
import { consume, presets } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/providers/email";
import { copy } from "@/content/copy";

const ok = () => NextResponse.json({ ok: true });

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients hit rate limits instead
  return new URL(origin).host === req.headers.get("host");
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
  }

  const ip = clientIp(req);
  const ipLimit = await consume(prisma, presets.applyPerIp, ip);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: copy.errors.rateLimited }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });
  }
  const input = parsed.data;

  // bots: honeypot filled, or the whole form "completed" in under five seconds.
  // They get the same success as everyone — nothing to learn here.
  if (input.website !== "" || Date.now() - input.startedAt < 5000) {
    return ok();
  }

  const emailLimit = await consume(prisma, presets.applyPerEmail, input.email);
  if (!emailLimit.allowed) {
    return NextResponse.json({ error: copy.errors.rateLimited }, { status: 429 });
  }

  // duplicates: never reveal existence — same success, silently attach
  const existing = await prisma.application.findFirst({
    where: {
      OR: [{ email: input.email }, { instagramHandle: input.instagram }],
      deletedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return ok();
  }

  // a fast-track invite token binds the referrer directly; otherwise a typed
  // member number or @handle in KNOW A ROSE? links one if it matches
  const invited = input.r
    ? await prisma.referral.findFirst({
        where: {
          inviteToken: input.r,
          status: "INVITED",
          inviteExpiresAt: { gt: new Date() },
        },
        select: { id: true, authorMemberId: true, instagramHandle: true },
      })
    : null;
  const referral = input.knowARose.trim().replace(/^@+/, "");
  const referrer = invited
    ? { id: invited.authorMemberId }
    : referral
      ? await prisma.memberProfile.findFirst({
          where: {
            OR: [{ memberNumber: referral }, { instagramHandle: referral.toLowerCase() }],
            deletedAt: null,
          },
          select: { id: true },
        })
      : null;

  await prisma.application.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      instagramHandle: input.instagram,
      email: input.email,
      phone: input.mobile,
      dateOfBirth: input.dateOfBirth,
      area: input.area || null,
      howFound: input.howFound || null,
      referralCode: invited ? `@${invited.instagramHandle}` : input.knowARose || null,
      referredById: referrer?.id ?? null,
      confirmedAdult: true,
      agreedHouseRules: true,
      consentMessaging: true,
      consentPrivacy: true,
      consentIp: ip,
      consentAt: new Date(),
    },
    select: { id: true },
  });

  if (invited) {
    await prisma.referral.update({
      where: { id: invited.id },
      data: { status: "APPLIED" },
    });
  }

  await sendEmail(prisma, {
    msg: {
      to: input.email,
      subject: copy.email.applied.subject,
      text: copy.email.applied.lines.join("\n"),
    },
    templateKey: "applied",
  }).catch(() => {
    // the application stands even if the email fails; the log row records it
  });

  return ok();
}
