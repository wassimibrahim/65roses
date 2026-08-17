// ConsoleEmailProvider — dev/test. Prints the message instead of sending it.
import type { SendResult } from "../types";
import type { EmailMessage, EmailProvider } from "./index";
import { redactEmail } from "./index";

export class ConsoleEmailProvider implements EmailProvider {
  async send(msg: EmailMessage): Promise<SendResult> {
    console.log(`[email → ${redactEmail(msg.to)}] ${msg.subject}\n${msg.text}`);
    return { ok: true, providerRef: `console-${Date.now()}` };
  }
}
