// StripePaymentProvider — the only file in the codebase allowed to import stripe.
import Stripe from "stripe";
import type {
  PaymentEvent,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
} from "./index";

export class StripePaymentProvider implements PaymentProvider {
  private client: Stripe | null = null;

  private stripe(): Stripe {
    if (!this.client) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
      this.client = new Stripe(key);
    }
    return this.client;
  }

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const intent = await this.stripe().paymentIntents.create(
      {
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        metadata: input.metadata,
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return { providerRef: intent.id, clientSecret: intent.client_secret ?? undefined };
  }

  async verifyWebhook(raw: string, sig: string): Promise<PaymentEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    const event = await this.stripe().webhooks.constructEventAsync(raw, sig, secret);

    switch (event.type) {
      case "payment_intent.succeeded":
        return {
          type: "payment.succeeded",
          providerRef: (event.data.object as Stripe.PaymentIntent).id,
          raw: event,
        };
      case "payment_intent.payment_failed":
        return {
          type: "payment.failed",
          providerRef: (event.data.object as Stripe.PaymentIntent).id,
          raw: event,
        };
      case "charge.refunded":
        return {
          type: "refund.succeeded",
          providerRef: (event.data.object as Stripe.Charge).payment_intent as string | null,
          raw: event,
        };
      default:
        return { type: "ignored", providerRef: null, raw: event };
    }
  }

  async refund(
    providerRef: string,
    amountCents?: number,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.stripe().refunds.create({ payment_intent: providerRef, amount: amountCents });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "refund failed" };
    }
  }
}
