import { describe, expect, it } from "vitest";
import { memberWhere } from "./member-filters";

describe("the members filter", () => {
  it("always excludes deleted Roses, whatever else is asked", () => {
    expect(memberWhere({}).deletedAt).toBeNull();
    expect(memberWhere({ status: "ACTIVE", q: "serena" }).deletedAt).toBeNull();
  });

  it("ignores a status nobody defined rather than returning nothing", () => {
    expect(memberWhere({ status: "BANNED" }).status).toBeUndefined();
    expect(memberWhere({ status: "AT_RISK" }).status).toBe("AT_RISK");
  });

  it("ignores a city nobody defined", () => {
    expect(memberWhere({ city: "PARIS" }).city).toBeUndefined();
    expect(memberWhere({ city: "MADRID" }).city).toBe("MADRID");
  });

  it("asks about deliveries in both directions", () => {
    expect(memberWhere({ delivered: "1" }).roseDeliveries).toEqual({
      some: { status: "DELIVERED" },
    });
    expect(memberWhere({ delivered: "0" }).roseDeliveries).toEqual({
      none: { status: "DELIVERED" },
    });
    expect(memberWhere({}).roseDeliveries).toBeUndefined();
  });

  it("treats no-shows as a floor, and ignores nonsense", () => {
    expect(memberWhere({ noShows: "2" }).eventsNoShow).toEqual({ gte: 2 });
    expect(memberWhere({ noShows: "0" }).eventsNoShow).toBeUndefined();
    expect(memberWhere({ noShows: "many" }).eventsNoShow).toBeUndefined();
  });

  it("takes either end of a last-attendance range, or both", () => {
    expect(memberWhere({ lastFrom: "2026-01-01" }).lastAttendanceAt).toEqual({
      gte: new Date("2026-01-01"),
    });
    expect(memberWhere({ lastTo: "2026-06-01" }).lastAttendanceAt).toEqual({
      lte: new Date("2026-06-01"),
    });
    expect(memberWhere({ lastFrom: "2026-01-01", lastTo: "2026-06-01" }).lastAttendanceAt).toEqual({
      gte: new Date("2026-01-01"),
      lte: new Date("2026-06-01"),
    });
    expect(memberWhere({ lastFrom: "not a date" }).lastAttendanceAt).toBeUndefined();
  });

  it("searches her name, her handle and her number — never her phone", () => {
    const where = memberWhere({ q: "0065" });
    expect(where.OR).toHaveLength(4);
    expect(JSON.stringify(where.OR)).toContain("memberNumber");
    expect(JSON.stringify(where.OR)).not.toContain("phone");
  });

  it("combines filters rather than letting the last one win", () => {
    const where = memberWhere({ status: "ACTIVE", city: "BEIRUT", founding: "1", noShows: "1" });
    expect(where.status).toBe("ACTIVE");
    expect(where.city).toBe("BEIRUT");
    expect(where.foundingRose).toBe(true);
    expect(where.eventsNoShow).toEqual({ gte: 1 });
  });
});
