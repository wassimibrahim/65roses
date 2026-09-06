// event DTO — venueName/venueAddress/venueNotes never leave the server before venueRevealAt.
// This is a hard rule from the constitution (§14). Whitelist mapping, never spread.
import type { Event } from "@prisma/client";

export interface EventDto {
  index: string;
  name: string;
  slug: string;
  city: Event["city"];
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  hours: "00—05";
  stemsAllowed: boolean;
  stemPriceCents: number;
  stemCurrency: string;
  rsvpDeadline: Date | null;
  venue: { name: string | null; address: string | null } | null;
}

export function toEventDto(event: Event, now: Date = new Date()): EventDto {
  const revealed = event.venueRevealAt !== null && now.getTime() >= event.venueRevealAt.getTime();
  return {
    index: event.index,
    name: event.name,
    slug: event.slug,
    city: event.city,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    hours: "00—05",
    stemsAllowed: event.stemsAllowed,
    stemPriceCents: event.stemPriceCents,
    stemCurrency: event.stemCurrency,
    rsvpDeadline: event.rsvpDeadline,
    venue: revealed ? { name: event.venueName, address: event.venueAddress } : null,
  };
}
