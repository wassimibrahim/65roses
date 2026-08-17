// TwilioSMSProvider — the real SMS rail, via Twilio's REST API.
// Errors are surfaced in SendResult; the full recipient number is never logged.
import type { SendResult } from "../types";
import type { SMSProvider } from "./index";

export class TwilioSMSProvider implements SMSProvider {
  async send(to: string, body: string): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) return { ok: false, error: "twilio env missing" };

    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      const json = (await res.json()) as { sid?: string; message?: string };
      if (!res.ok) return { ok: false, error: json.message ?? `twilio ${res.status}` };
      return { ok: true, providerRef: json.sid };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "twilio send failed" };
    }
  }
}
