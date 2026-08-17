// EmailProvider — interface, env-selected factory, and the logged send path.
import type { MessageChannel } from "@prisma/client";
import type { SendResult } from "../types";
import { ConsoleEmailProvider } from "./console";
import { ResendEmailProvider } from "./resend";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<SendResult>;
}

export function redactEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}…@${domain}`;
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  cached =
    process.env.EMAIL_PROVIDER === "resend"
      ? new ResendEmailProvider()
      : new ConsoleEmailProvider();
  return cached;
}

export interface MessageLogDb {
  messageLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

export async function sendEmail(
  db: MessageLogDb,
  input: {
    msg: EmailMessage;
    templateKey: string;
    memberId?: string;
    eventId?: string;
    stemGuestId?: string;
  },
  provider: EmailProvider = getEmailProvider(),
): Promise<SendResult> {
  const channel: MessageChannel = "EMAIL";
  const log = await db.messageLog.create({
    data: {
      channel,
      status: "QUEUED",
      templateKey: input.templateKey,
      toRedacted: redactEmail(input.msg.to),
      memberId: input.memberId,
      eventId: input.eventId,
      stemGuestId: input.stemGuestId,
    },
  });

  const result = await provider.send(input.msg);

  await db.messageLog.update({
    where: { id: log.id },
    data: result.ok
      ? { status: "SENT", sentAt: new Date(), providerRef: result.providerRef }
      : { status: "FAILED", error: result.error },
  });

  return result;
}
