// GET /api/me/data — her copy of everything we hold about her.
//
// The one response in the system allowed to carry her address and her whole
// phone number, because it is going to her. It is never cached and never
// reachable for anyone but the person it describes.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { exportSubjectData } from "@/lib/privacy/subject-data";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const data = await exportSubjectData(prisma, user.memberId);
  if (!data) return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });

  // she asked for her own file; the trail records that it left, not what was in it
  await audit(prisma, {
    action: "subject.export",
    entityType: "MemberProfile",
    entityId: user.memberId,
    actorId: user.id,
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="65.json"',
      "Cache-Control": "no-store, private",
    },
  });
}
