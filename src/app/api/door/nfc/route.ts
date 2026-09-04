// POST /api/door/nfc — { uid, eventId } → the roster entry, in the same shape
// the door's own search produces, so the interface needs no new screen: a tap
// lands on exactly the page a typed name would have.
//
// This resolves a person. It does not admit one. Entry still goes through
// /api/door/enter with her four digits.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { resolveNfc } from "@/lib/door/nfc";
import { doorState } from "@/lib/door/roster";
import { tonight } from "@/lib/door/tonight";
import { doorCity } from "@/lib/door/session";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

const schema = z.object({ uid: z.string().min(4).max(64), eventId: z.string().optional() });

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

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });
  }

  const event = await tonight(prisma, new Date(), await doorCity());
  if (!event || (parsed.data.eventId && parsed.data.eventId !== event.id)) {
    return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
  }

  const match = await resolveNfc(prisma, parsed.data.uid, event.id);
  if (!match) {
    // an unknown tag is not an error worth explaining at the door
    return NextResponse.json({ entry: null });
  }

  const state = await doorState(prisma, event.id);
  const entry = state.roster.find((r) => r.subject === match.subject && r.id === match.id) ?? null;

  await audit(prisma, {
    action: "door.nfc.read",
    entityType: match.subject === "ROSE" ? "Rsvp" : "StemGuest",
    entityId: match.id,
    actorId: actor.id,
  });

  return NextResponse.json({ entry });
}
