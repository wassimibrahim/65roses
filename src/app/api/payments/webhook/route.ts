// POST /api/payments/webhook — the ONLY place a payment becomes PAID.
// Signature-verified by the provider, idempotent by construction: a replayed
// event finds the payment already PAID and does nothing.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getPaymentProvider } from "@/lib/providers/payment";
import { ensureStemCredential } from "@/lib/stem-credential";
import { sendSMS } from "@/lib/providers/sms";
import { copy, fill } from "@/content/copy";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") ?? req.headers.get("x-signature") ?? "";

  let event;
  try {
    event = await getPaymentProvider().verifyWebhook(raw, sig);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (!event.providerRef || event.type === "ignored") {
    return NextResponse.json({ received: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { providerRef: event.providerRef },
    select: { id: true, status: true, stemGuestId: true, eventId: true },
  });
  if (!payment) return NextResponse.json({ received: true });

  if (event.type === "payment.succeeded") {
    if (payment.status === "PAID") return NextResponse.json({ received: true }); // replay

    const notify = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { paidAt: new Date(), status: "PAID", rawEventJson: JSON.parse(raw) },
      });
      if (!payment.stemGuestId || !payment.eventId) return null;

      await tx.stemGuest.update({
        where: { id: payment.stemGuestId },
        data: { paymentStatus: "PAID" },
      });
      await ensureStemCredential(tx, payment.stemGuestId, payment.eventId);

      return tx.stemGuest.findUnique({
        where: { id: payment.stemGuestId },
        select: {
          firstName: true,
          eventId: true,
          hostMember: { select: { id: true, phone: true } },
        },
      });
    });

    // she hears his first name and nothing else
    if (notify?.hostMember) {
      await sendSMS(prisma, {
        to: notify.hostMember.phone,
        body: fill(copy.sms.stemPaid, { name: notify.firstName }),
        templateKey: "stem_paid",
        memberId: notify.hostMember.id,
        eventId: notify.eventId,
      }).catch(() => {});
    }
  }

  if (event.type === "payment.failed" && payment.status === "PENDING") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", rawEventJson: JSON.parse(raw) },
    });
  }

  if (event.type === "refund.succeeded" && payment.status === "PAID") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED", refundedAt: new Date(), rawEventJson: JSON.parse(raw) },
    });
    if (payment.stemGuestId) {
      await prisma.stemGuest.update({
        where: { id: payment.stemGuestId },
        data: { paymentStatus: "REFUNDED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
