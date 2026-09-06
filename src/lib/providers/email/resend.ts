// ResendEmailProvider — the real email rail, via Resend's REST API.
import type { SendResult } from "../types";
import type { EmailMessage, EmailProvider } from "./index";

export class ResendEmailProvider implements EmailProvider {
  async send(msg: EmailMessage): Promise<SendResult> {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) return { ok: false, error: "resend env missing" };

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          ...(msg.html ? { html: msg.html } : {}),
        }),
      });
      const json = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) return { ok: false, error: json.message ?? `resend ${res.status}` };
      return { ok: true, providerRef: json.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "resend send failed" };
    }
  }
}
