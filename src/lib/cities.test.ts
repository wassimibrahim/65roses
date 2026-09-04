import { describe, expect, it } from "vitest";
import { announcedCities, CITY_DEFAULTS, HOME_CITY } from "./cities";
import type { Db } from "@/lib/db/client";

const db = (rows: { city: string }[]) =>
  ({ event: { findMany: async () => rows } }) as unknown as Db;

describe("which cities the landing page may speak", () => {
  it("Beirut, always, even with nothing scheduled anywhere", async () => {
    expect(await announcedCities(db([]))).toEqual(["BEIRUT"]);
  });

  it("Madrid only once Madrid has a night", async () => {
    expect(await announcedCities(db([{ city: "MADRID" }]))).toEqual(["BEIRUT", "MADRID"]);
  });

  it("home is Beirut and is never displaced", async () => {
    expect(HOME_CITY).toBe("BEIRUT");
    const cities = await announcedCities(db([{ city: "MADRID" }]));
    expect(cities[0]).toBe("BEIRUT");
  });

  it("each city carries its own timezone, currency and capacity", () => {
    expect(CITY_DEFAULTS.BEIRUT.timezone).toBe("Asia/Beirut");
    expect(CITY_DEFAULTS.MADRID.timezone).toBe("Europe/Madrid");
    expect(CITY_DEFAULTS.BEIRUT.currency).not.toBe(CITY_DEFAULTS.MADRID.currency);
    for (const city of ["BEIRUT", "MADRID"] as const) {
      const d = CITY_DEFAULTS[city];
      expect(d.capacityRoses + d.capacityStems).toBeLessThanOrEqual(d.capacityTotal);
    }
  });
});
