// POST /api/me/delete — erasure, at her request, immediately.
//
// She confirms by typing her own member number. Not a checkbox and not a
// second email: the number is the one thing she knows and nobody else on the
// page does, and typing it is a deliberate act at four in the morning.
//
// What survives the erasure and why is documented in eraseSubject and in
// SECURITY.md. Nothing here touches her Rose: the object was always hers, and
// leaving does not make it ours.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { eraseSubject } from "@/lib/privacy/subject-data";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

const schema = z.object({ memberNumber: z.string().trim().regex(/^\d{4}$/) });

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireVerifiedPhone();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
    }
    throw err;
  }
  if (!user.memberId) {
    return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });
  }

  const member = await prisma.memberProfile.findUnique({
    where: { id: user.memberId },
    select: { memberNumber: true },
  });
  if (!member || member.memberNumber !== parsed.data.memberNumber) {
    return NextResponse.json({ error: copy.errors.wrongCode }, { status: 400 });
  }

  // written before the erasure, because afterwards there is no id to name
  await audit(prisma, {
    action: "subject.erase",
    entityType: "MemberProfile",
    entityId: user.memberId,
    actorId: user.id,
    after: { memberNumber: member.memberNumber },
  });

  const result = await eraseSubject(prisma, user.memberId);
  if (!result) return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });

  return NextResponse.json({ ok: true });
}
