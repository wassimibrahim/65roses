// POST /api/door/manual — a walk-in. A name, a number, and a person's reason.
// This is the one path into the room that no invitation preceded, so it is the
// one most carefully written down: the audit row names the host and the reason.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { tonight } from "@/lib/door/tonight";
import { normalizePhone } from "@/lib/validation/apply";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

const schema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).default(""),
  phone: z.string().trim().min(6).max(32),
  reason: z.string().trim().min(3).max(200),
  subject: z.enum(["ROSE", "STEM"]).default("STEM"),
});

export async function POST(req: NextRequest) {
  let actor;
  try {
    actor = await requireDoor();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
    }
    throw err;
  }

  const event = await tonight(prisma);
  if (!event) return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });

  const checkIn = await prisma.checkIn.create({
    data: {
      eventId: event.id,
      subject: parsed.data.subject,
      enteredAt: new Date(),
      verifiedBy: actor.id,
      verifyMethod: "MANUAL",
      overrideReason: `${parsed.data.reason} — ${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
    },
    select: { id: true, enteredAt: true },
  });

  // the number is required so a host cannot wave someone in on a name alone,
  // but only its last four digits are kept — a full phone is never written to a
  // log, and the audit trail is a log
  await audit(prisma, {
    action: "door.manual",
    entityType: "CheckIn",
    entityId: checkIn.id,
    actorId: actor.id,
    after: {
      name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
      last4: phone.slice(-4),
      subject: parsed.data.subject,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ verdict: "IN", enteredAt: checkIn.enteredAt.toISOString() });
}
