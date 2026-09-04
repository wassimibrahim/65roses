// The world is Beirut. Madrid is a place the world may also be, one night at
// a time — never a dropdown on the landing page, never a choice she is asked
// to make. A second line appears there only once a second city has a night.
import type { City } from "@prisma/client";
import type { Db } from "@/lib/db/client";
import { copy } from "@/content/copy";

export const HOME_CITY: City = "BEIRUT";

export const CITY_LINE: Record<City, string> = {
  BEIRUT: copy.landing.home,
  MADRID: copy.landing.madrid,
};

export const CITY_DEFAULTS: Record<
  City,
  { timezone: string; currency: string; stemPriceCents: number; capacityTotal: number; capacityRoses: number; capacityStems: number }
> = {
  BEIRUT: {
    timezone: "Asia/Beirut",
    currency: "USD",
    stemPriceCents: 4000,
    capacityTotal: 120,
    capacityRoses: 80,
    capacityStems: 40,
  },
  MADRID: {
    timezone: "Europe/Madrid",
    currency: "EUR",
    stemPriceCents: 4000,
    capacityTotal: 140,
    capacityRoses: 90,
    capacityStems: 50,
  },
};

/**
 * Which cities the landing page may speak. Beirut always; another only once a
 * night exists there that is not a draft. Nobody announces a city by editing a
 * constant — a city is announced by a night.
 */
export async function announcedCities(db: Db, now: Date = new Date()): Promise<City[]> {
  const rows = await db.event.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      endsAt: { gt: now },
      city: { not: HOME_CITY },
    },
    distinct: ["city"],
    select: { city: true },
  });

  return [HOME_CITY, ...rows.map((r) => r.city)];
}
