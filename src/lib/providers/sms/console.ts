// ConsoleSMSProvider — dev/test. Logs the body and a redacted recipient, never the full number.
import type { SendResult } from "../types";
import type { SMSProvider } from "./index";
import { redactPhone } from "./index";

export class ConsoleSMSProvider implements SMSProvider {
  async send(to: string, body: string): Promise<SendResult> {
    console.log(`[sms → ${redactPhone(to)}]\n${body}`);
    return { ok: true, providerRef: `console-${Date.now()}` };
  }
}
