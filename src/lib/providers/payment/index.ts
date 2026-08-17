// PaymentProvider — the only doorway to any payment rail.
// No file outside src/lib/providers/payment may import the stripe package (enforced by ESLint).
// The webhook event returned by verifyWebhook is the ONLY thing allowed to mark a payment PAID.
import { ConsolePaymentProvider } from "./console";
import { StripePaymentProvider } from "./stripe";
import { WhishPaymentProvider } from "./whish";

export interface PaymentIntentInput {
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  providerRef: string;
  clientSecret?: string;
}

export type PaymentEventType =
  "payment.succeeded" | "payment.failed" | "refund.succeeded" | "ignored";

export interface PaymentEvent {
  type: PaymentEventType;
  providerRef: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(raw: string, sig: string): Promise<PaymentEvent>;
  refund(providerRef: string, amountCents?: number): Promise<{ ok: boolean; error?: string }>;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented`);
    this.name = "NotImplementedError";
  }
}

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  switch (process.env.PAYMENT_PROVIDER) {
    case "stripe":
      cached = new StripePaymentProvider();
      break;
    case "whish":
      cached = new WhishPaymentProvider();
      break;
    default:
      cached = new ConsolePaymentProvider();
  }
  return cached;
}
