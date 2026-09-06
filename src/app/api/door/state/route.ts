// GET /api/door/state — tonight's list and the count inside.
// The door polls this every ten seconds and caches the answer, so a phone that
// loses signal still knows who is expected.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { doorState } from "@/lib/door/roster";
import { tonight } from "@/lib/door/tonight";
import { doorCity } from "@/lib/door/session";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

const nothing = () => NextResponse.json({ error: copy.errors.notFound }, { status: 404 });

export async function GET() {
  try {
    await requireDoor();
  } catch (err) {
    if (err instanceof AuthError) return nothing();
    throw err;
  }

  const event = await tonight(prisma, new Date(), await doorCity());
  if (!event) return nothing();

  return NextResponse.json(await doorState(prisma, event.id));
}
