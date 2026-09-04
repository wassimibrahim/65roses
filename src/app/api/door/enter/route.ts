// POST /api/door/enter — the only way a check-in row is ever written.
// Codes, overrides and replayed offline entries all come through here, and
// every one of them leaves an audit row naming the host who let her in.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { admit, doorEntrySchema } from "@/lib/door/entry";
import { tonight } from "@/lib/door/tonight";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

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

  const parsed = doorEntrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });
  }

  const result = await admit(prisma, event.id, actor, parsed.data);
  return NextResponse.json(result);
}
