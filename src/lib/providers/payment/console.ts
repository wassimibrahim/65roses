// ConsolePaymentProvider — dev/test. Pretends every intent succeeds; webhooks parse as-is.
import type {
  PaymentEvent,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
} from "./index";

export class ConsolePaymentProvider implements PaymentProvider {
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    console.log(
      `[payment] intent ${input.amountCents} ${input.currency} (${input.idempotencyKey})`,
    );
    return { providerRef: `console-pi-${input.idempotencyKey}`, clientSecret: "console-secret" };
  }

  async verifyWebhook(raw: string): Promise<PaymentEvent> {
    const parsed = JSON.parse(raw) as { type?: string; providerRef?: string };
    const type =
      parsed.type === "payment.succeeded" ||
      parsed.type === "payment.failed" ||
      parsed.type === "refund.succeeded"
        ? parsed.type
        : "ignored";
    return { type, providerRef: parsed.providerRef ?? null, raw: parsed };
  }

  async refund(providerRef: string): Promise<{ ok: boolean; error?: string }> {
    console.log(`[payment] refund ${providerRef}`);
    return { ok: true };
  }
}
