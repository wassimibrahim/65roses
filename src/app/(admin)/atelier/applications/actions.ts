"use server";

// application review actions. APPROVE is one transaction:
// number allocation → User → MemberProfile → RoseCredential → RoseDelivery →
// welcome token → audit. The email is queued after commit.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { opaqueToken } from "@/lib/crypto/token";
import { sendEmail } from "@/lib/providers/email";
import { approvalEmail } from "@/content/emails";

const WELCOME_TOKEN_DAYS = 30;

async function actionContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function approveApplication(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({
      id: z.string().min(1),
      numberOverride: z
        .string()
        .trim()
        .regex(/^\d{4}$/)
        .optional()
        .or(z.literal("").transform(() => undefined)),
    })
    .parse({
      id: formData.get("id"),
      numberOverride: formData.get("numberOverride") ?? "",
    });

  const { welcomeToken, memberNumber, email } = await prisma.$transaction(async (tx) => {
    const app = await tx.application.findUniqueOrThrow({ where: { id: input.id } });
    if (app.status === "APPROVED") throw new Error("already approved");

    // 1 — the number, atomically. Founding overrides are validated as unused.
    let memberNumber: string;
    if (input.numberOverride) {
      const taken = await tx.memberProfile.findUnique({
        where: { memberNumber: input.numberOverride },
        select: { id: true },
      });
      if (taken) throw new Error("number taken");
      memberNumber = input.numberOverride;
      // keep the sequence ahead of manual allocations
      const n = parseInt(input.numberOverride, 10);
      await tx.$executeRaw`UPDATE "MemberNumberSequence" SET current = GREATEST(current, ${n}) WHERE id = 1`;
    } else {
      const rows = await tx.$queryRaw<{ current: number }[]>`
        UPDATE "MemberNumberSequence" SET current = current + 1 WHERE id = 1 RETURNING current`;
      memberNumber = String(rows[0]!.current).padStart(4, "0");
    }

    // 2 — identity (no password yet; she sets it at ENTER 65)
    const user = await tx.user.create({
      data: { email: app.email, role: "MEMBER" },
      select: { id: true },
    });
    const member = await tx.memberProfile.create({
      data: {
        userId: user.id,
        applicationId: app.id,
        memberNumber,
        firstName: app.firstName,
        lastName: app.lastName,
        instagramHandle: app.instagramHandle,
        phone: app.phone,
        dateOfBirth: app.dateOfBirth,
        city: app.city,
        area: app.area,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // 3 — the Rose itself, engraved with her number, forever
    await tx.roseCredential.create({
      data: {
        memberId: member.id,
        engravedNumber: memberNumber,
        serial: `R${memberNumber}-${opaqueToken(6)}`,
        qrToken: opaqueToken(16),
        status: "ASSIGNED",
      },
    });

    // 4 — delivery starts waiting for her address
    await tx.roseDelivery.create({
      data: { memberId: member.id, status: "PENDING_ADDRESS" },
    });

    // 5 — the single-use welcome token, 30 days
    const welcomeToken = opaqueToken(24);
    await tx.application.update({
      where: { id: app.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        welcomeToken,
        welcomeTokenExp: new Date(Date.now() + WELCOME_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    // 7 — the audit row rides the same transaction
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "application.approve",
        entityType: "Application",
        entityId: app.id,
        before: { status: app.status },
        after: { status: "APPROVED", memberNumber },
        ip,
        userAgent,
      },
    });

    return { welcomeToken, memberNumber, email: app.email };
  });

  // 6 — the approval email, queued after commit so a failed send never rolls back her Rose
  const welcomeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/welcome?t=${welcomeToken}`;
  const mail = approvalEmail(memberNumber, welcomeUrl);
  await sendEmail(prisma, {
    msg: { to: email, ...mail },
    templateKey: "approval",
  }).catch(() => {});

  revalidatePath("/atelier/applications");
}

export async function waitlistApplication(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const id = z.string().min(1).parse(formData.get("id"));
  const app = await prisma.application.update({
    where: { id },
    data: { status: "WAITLIST", reviewedAt: new Date(), reviewedBy: admin.id },
    select: { id: true },
  });
  await audit(prisma, {
    action: "application.waitlist",
    entityType: "Application",
    entityId: app.id,
    actorId: admin.id,
    after: { status: "WAITLIST" },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/applications");
}

export async function declineApplication(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const id = z.string().min(1).parse(formData.get("id"));
  const app = await prisma.application.update({
    where: { id },
    data: { status: "DECLINED", reviewedAt: new Date(), reviewedBy: admin.id },
    select: { id: true },
  });
  await audit(prisma, {
    action: "application.decline",
    entityType: "Application",
    entityId: app.id,
    actorId: admin.id,
    after: { status: "DECLINED" },
    ip,
    userAgent,
  });
  revalidatePath("/atelier/applications");
}

export async function addApplicationNote(formData: FormData): Promise<void> {
  const { admin, ip, userAgent } = await actionContext();
  const input = z
    .object({ id: z.string().min(1), body: z.string().trim().min(1).max(2000) })
    .parse({ id: formData.get("id"), body: formData.get("body") });
  await prisma.adminNote.create({
    data: { applicationId: input.id, body: input.body, authorId: admin.id },
  });
  await audit(prisma, {
    action: "application.note.add",
    entityType: "Application",
    entityId: input.id,
    actorId: admin.id,
    ip,
    userAgent,
  });
  revalidatePath("/atelier/applications");
}
