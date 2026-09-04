// POST /api/door/cash — he is paying at the door. A Payment row with provider
// CASH, then his bracelet exists. No calling code names a payment company;
// CASH is simply another provider kind.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { tonight } from "@/lib/door/tonight";
import { doorCity } from "@/lib/door/session";
import { ensureStemCredential } from "@/lib/stem-credential";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

const schema = z.object({ id: z.string().min(1) });

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

  const event = await tonight(prisma, new Date(), await doorCity());
  if (!event) return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });
  }

  const stem = await prisma.stemGuest.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, eventId: true, hostMemberId: true, paymentStatus: true },
  });
  if (!stem || stem.eventId !== event.id) {
    return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
  }
  if (stem.paymentStatus === "PAID") return NextResponse.json({ ok: true });

  const price = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    select: { stemPriceCents: true, stemCurrency: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        eventId: event.id,
        stemGuestId: stem.id,
        memberId: stem.hostMemberId,
        provider: "CASH",
        status: "PAID",
        amountCents: price.stemPriceCents,
        currency: price.stemCurrency,
        // the door is the idempotency key: one cash payment per guest
        idempotencyKey: `cash:${stem.id}`,
        paidAt: new Date(),
      },
    });
    await tx.stemGuest.update({
      where: { id: stem.id },
      data: { paymentStatus: "PAID" },
    });
  });

  await ensureStemCredential(prisma, stem.id, event.id);
  await audit(prisma, {
    action: "door.cash",
    entityType: "StemGuest",
    entityId: stem.id,
    actorId: actor.id,
    after: { amountCents: price.stemPriceCents, currency: price.stemCurrency },
  });

  return NextResponse.json({ ok: true });
}
