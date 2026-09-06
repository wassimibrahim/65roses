// Membership, if there ever is one.
//
// The rule that shapes this file: a lapsed payment never changes her status and
// never touches her Rose. The jewellery is hers forever — we said so — and a
// failed card is a conversation, not a punishment. So nothing here writes to
// MemberProfile.status or RoseCredential; it records what the rail said and
// puts it in front of a person in the atelier.
//
// Her side of it is one line on /rose and nothing else. There is no pricing
// page, no plan comparison, no upgrade prompt, and no place to compare herself
// to another Rose.
import type { Db } from "@/lib/db/client";

export type SubscriptionState = "ACTIVE" | "LAPSED" | "CANCELLING" | "INACTIVE";

/**
 * What she is shown: one word, or nothing at all. A subscription that has never
 * existed produces null, and null renders no line rather than an empty one.
 */
export function memberSubscriptionLine(sub: {
  status: string;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
} | null): SubscriptionState | null {
  if (!sub) return null;
  if (sub.cancelAt && sub.cancelAt.getTime() > Date.now()) return "CANCELLING";
  if (sub.status !== "ACTIVE") return sub.status === "LAPSED" ? "LAPSED" : "INACTIVE";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return "LAPSED";
  return "ACTIVE";
}

/**
 * A rail told us a renewal succeeded or failed. This is the only writer, and
 * it writes to Subscription alone — deliberately never to her status.
 */
export async function applySubscriptionEvent(
  db: Db,
  memberId: string,
  event: { ok: boolean; providerRef?: string; periodEnd?: Date },
): Promise<void> {
  const existing = await db.subscription.findUnique({
    where: { memberId },
    select: { id: true, provider: true },
  });

  const data = {
    status: event.ok ? "ACTIVE" : "LAPSED",
    ...(event.providerRef ? { providerRef: event.providerRef } : {}),
    ...(event.periodEnd ? { currentPeriodEnd: event.periodEnd } : {}),
  };

  if (existing) {
    await db.subscription.update({ where: { memberId }, data });
  } else {
    await db.subscription.create({
      data: {
        memberId,
        provider: "STRIPE",
        ...data,
      },
    });
  }
}
