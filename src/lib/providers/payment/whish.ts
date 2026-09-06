// WhishPaymentProvider — Lebanon's rail. Arrives in Phase 5; the interface is already its shape.
import type {
  PaymentEvent,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
} from "./index";
import { NotImplementedError } from "./index";

export class WhishPaymentProvider implements PaymentProvider {
  async createIntent(_input: PaymentIntentInput): Promise<PaymentIntentResult> {
    throw new NotImplementedError("WhishPaymentProvider.createIntent");
  }

  async verifyWebhook(_raw: string, _sig: string): Promise<PaymentEvent> {
    throw new NotImplementedError("WhishPaymentProvider.verifyWebhook");
  }

  async refund(_providerRef: string): Promise<{ ok: boolean; error?: string }> {
    throw new NotImplementedError("WhishPaymentProvider.refund");
  }
}
