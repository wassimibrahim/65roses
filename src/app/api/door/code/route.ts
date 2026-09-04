// POST /api/door/code — she is standing here and never got her four digits.
// A fresh code replaces the old one, so the one in an old SMS stops working.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { generateDoorCode, hashDoorCode, roseCodeContext, stemCodeContext } from "@/lib/door/code";
import { tonight } from "@/lib/door/tonight";
import { sendSMS } from "@/lib/providers/sms";
import { audit } from "@/lib/audit";
import { copy, fill } from "@/content/copy";

export const dynamic = "force-dynamic";

const schema = z.object({ subject: z.enum(["ROSE", "STEM"]), id: z.string().min(1) });

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

  const code = generateDoorCode();

  if (parsed.data.subject === "ROSE") {
    const rsvp = await prisma.rsvp.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, eventId: true, memberId: true, member: { select: { phone: true } } },
    });
    if (!rsvp || rsvp.eventId !== event.id) {
      return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
    }
    await prisma.rsvp.update({
      where: { id: rsvp.id },
      data: {
        doorCodeHash: hashDoorCode(code, roseCodeContext(event.id, rsvp.memberId)),
        doorCodeIssuedAt: new Date(),
        doorCodeUsedAt: null,
      },
    });
    await sendSMS(prisma, {
      to: rsvp.member.phone,
      body: fill(copy.sms.doorCode, { name: event.name, code }),
      templateKey: "door_code",
      memberId: rsvp.memberId,
      eventId: event.id,
    }).catch(() => {});
  } else {
    const stem = await prisma.stemGuest.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, eventId: true, phone: true },
    });
    if (!stem || stem.eventId !== event.id) {
      return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
    }
    await prisma.stemGuest.update({
      where: { id: stem.id },
      data: {
        doorCodeHash: hashDoorCode(code, stemCodeContext(event.id, stem.id)),
        doorCodeIssuedAt: new Date(),
        doorCodeUsedAt: null,
      },
    });
    await sendSMS(prisma, {
      to: stem.phone,
      body: fill(copy.sms.doorCode, { name: event.name, code }),
      templateKey: "door_code",
      eventId: event.id,
      stemGuestId: stem.id,
    }).catch(() => {});
  }

  await audit(prisma, {
    action: "door.code.send",
    entityType: parsed.data.subject === "ROSE" ? "Rsvp" : "StemGuest",
    entityId: parsed.data.id,
    actorId: actor.id,
  });

  return NextResponse.json({ ok: true });
}
