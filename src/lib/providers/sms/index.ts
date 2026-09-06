// SMSProvider — interface, env-selected factory, and the logged send path.
// Full phone numbers are never logged anywhere; MessageLog stores last 3 digits only.
import type { MessageChannel } from "@prisma/client";
import type { SendResult } from "../types";
import { ConsoleSMSProvider } from "./console";
import { TwilioSMSProvider } from "./twilio";

export interface SMSProvider {
  send(to: string, body: string): Promise<SendResult>;
}

export function redactPhone(phone: string): string {
  return `•••••${phone.slice(-3)}`;
}

let cached: SMSProvider | null = null;

export function getSMSProvider(): SMSProvider {
  if (cached) return cached;
  cached =
    process.env.SMS_PROVIDER === "twilio" ? new TwilioSMSProvider() : new ConsoleSMSProvider();
  return cached;
}

export interface MessageLogDb {
  messageLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

// every SMS goes through here so every send leaves a MessageLog row
export async function sendSMS(
  db: MessageLogDb,
  input: {
    to: string;
    body: string;
    templateKey: string;
    memberId?: string;
    eventId?: string;
    stemGuestId?: string;
  },
  provider: SMSProvider = getSMSProvider(),
): Promise<SendResult> {
  const channel: MessageChannel = "SMS";
  const log = await db.messageLog.create({
    data: {
      channel,
      status: "QUEUED",
      templateKey: input.templateKey,
      toRedacted: redactPhone(input.to),
      memberId: input.memberId,
      eventId: input.eventId,
      stemGuestId: input.stemGuestId,
    },
  });

  const result = await provider.send(input.to, input.body);

  await db.messageLog.update({
    where: { id: log.id },
    data: result.ok
      ? { status: "SENT", sentAt: new Date(), providerRef: result.providerRef }
      : { status: "FAILED", error: result.error },
  });

  return result;
}
