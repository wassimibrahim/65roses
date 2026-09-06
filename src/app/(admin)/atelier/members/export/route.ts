// GET /atelier/members/export — the CSV.
//
// Addresses require an OWNER. An ADMIN who asks for them is not told that the
// option exists; they simply receive the ordinary file. Either way the export
// writes an audit row saying who took what, how many rows, and whether
// addresses were in it.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { AuthError, requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { memberWhere } from "@/lib/atelier/member-filters";
import { toCsv, type ExportRow } from "@/lib/atelier/export";
import { copy } from "@/content/copy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: copy.errors.notFound }, { status: 404 });
    }
    throw err;
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const asked = params.addresses === "1";
  const withAddresses = asked && admin.role === "OWNER";

  const members = await prisma.memberProfile.findMany({
    where: memberWhere(params),
    orderBy: { memberNumber: "asc" },
    take: 2000,
    select: {
      memberNumber: true,
      firstName: true,
      lastName: true,
      instagramHandle: true,
      status: true,
      city: true,
      communityStatus: true,
      eventsInvited: true,
      eventsAttended: true,
      eventsNoShow: true,
      lastAttendanceAt: true,
      ...(withAddresses
        ? { phone: true, deliveryAddress: { select: { area: true, addressLine: true } } }
        : {}),
    },
  });

  const rows: ExportRow[] = members.map((member) => {
    const row = member as (typeof members)[number] & {
      phone?: string;
      deliveryAddress?: { area: string; addressLine: string } | null;
    };
    return {
      memberNumber: row.memberNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      instagramHandle: row.instagramHandle,
      status: row.status,
      city: row.city,
      communityStatus: row.communityStatus,
      eventsInvited: row.eventsInvited,
      eventsAttended: row.eventsAttended,
      eventsNoShow: row.eventsNoShow,
      lastAttendanceAt: row.lastAttendanceAt,
      ...(withAddresses
        ? {
            phone: row.phone ?? "",
            area: row.deliveryAddress?.area ?? "",
            addressLine: row.deliveryAddress?.addressLine ?? "",
          }
        : {}),
    };
  });

  await audit(prisma, {
    action: withAddresses ? "members.export.addresses" : "members.export",
    entityType: "MemberProfile",
    entityId: "export",
    actorId: admin.id,
    after: { rows: rows.length, withAddresses, filters: params },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return new NextResponse(toCsv(rows, withAddresses), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="roses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
