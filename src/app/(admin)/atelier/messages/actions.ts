"use server";

// Resending, and a test send that renders a template against fake data so
// nobody proofreads a message by firing it at a Rose.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { sendSMS } from "@/lib/providers/sms";
import { sendEmail } from "@/lib/providers/email";
import { TEMPLATES } from "./templates";

/**
 * Send a rendered template to a number or address the staff member types.
 * It never resolves a member: a test send cannot reach a Rose by accident.
 */
export async function testSend(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const input = z
    .object({ template: z.string().min(1), to: z.string().trim().min(3).max(200) })
    .parse({ template: formData.get("template"), to: formData.get("to") });

  const template = TEMPLATES[input.template];
  if (!template) return;
  const body = template.render();

  if (template.channel === "SMS") {
    await sendSMS(prisma, { to: input.to, body, templateKey: `test:${input.template}` }).catch(
      () => {},
    );
  } else {
    await sendEmail(prisma, {
      msg: { to: input.to, subject: `65 — ${input.template}`, text: body },
      templateKey: `test:${input.template}`,
    }).catch(() => {});
  }

  await audit(prisma, {
    action: "message.test_send",
    entityType: "MessageLog",
    entityId: input.template,
    actorId: admin.id,
    after: { template: input.template },
  });

  revalidatePath("/atelier/messages");
}

/**
 * Resend a message that failed. The recipient is read from the original's
 * relations, never from the log row — the log holds three digits, on purpose.
 */
export async function resendMessage(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = z.string().min(1).parse(formData.get("id"));

  const log = await prisma.messageLog.findUnique({
    where: { id },
    select: {
      id: true,
      channel: true,
      templateKey: true,
      memberId: true,
      eventId: true,
      stemGuestId: true,
      member: { select: { phone: true, user: { select: { email: true } } } },
    },
  });
  if (!log) return;

  const template = TEMPLATES[log.templateKey];
  if (!template) return;
  const body = template.render();

  if (log.channel === "SMS" && log.member?.phone) {
    await sendSMS(prisma, {
      to: log.member.phone,
      body,
      templateKey: log.templateKey,
      memberId: log.memberId ?? undefined,
      eventId: log.eventId ?? undefined,
    }).catch(() => {});
  } else if (log.channel === "EMAIL" && log.member?.user.email) {
    await sendEmail(prisma, {
      msg: { to: log.member.user.email, subject: "65", text: body },
      templateKey: log.templateKey,
      memberId: log.memberId ?? undefined,
      eventId: log.eventId ?? undefined,
    }).catch(() => {});
  }

  await audit(prisma, {
    action: "message.resend",
    entityType: "MessageLog",
    entityId: log.id,
    actorId: admin.id,
    after: { templateKey: log.templateKey },
  });

  revalidatePath("/atelier/messages");
}
