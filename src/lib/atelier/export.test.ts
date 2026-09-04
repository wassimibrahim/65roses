import { describe, expect, it } from "vitest";
import { toCsv, type ExportRow } from "./export";

const row: ExportRow = {
  memberNumber: "0065",
  firstName: "Serena",
  lastName: "Haddad",
  instagramHandle: "serena.h",
  status: "ACTIVE",
  city: "BEIRUT",
  communityStatus: "JOINED",
  eventsInvited: 5,
  eventsAttended: 3,
  eventsNoShow: 1,
  lastAttendanceAt: new Date("2026-05-02T00:00:00Z"),
  phone: "+9613123456",
  addressLine: "Rue Gouraud 12",
  area: "Mar Mikhael",
};

describe("the members export", () => {
  it("leaves addresses and phones out unless they were asked for", () => {
    const csv = toCsv([row], false);
    expect(csv).not.toContain("+9613123456");
    expect(csv).not.toContain("Rue Gouraud");
    expect(csv).not.toContain("addressLine");
    expect(csv).toContain("0065");
  });

  it("includes them when an owner ticked the box", () => {
    const csv = toCsv([row], true);
    expect(csv).toContain("+9613123456");
    expect(csv).toContain("Rue Gouraud 12");
  });

  it("never lets a field become a spreadsheet formula", () => {
    const nasty = { ...row, firstName: "=1+1", lastName: "+HYPERLINK(\"x\")" };
    const csv = toCsv([nasty], false);
    expect(csv).toContain(`"'=1+1"`);
    expect(csv).toContain(`"'+HYPERLINK("`);
    expect(csv).not.toMatch(/,=1\+1/);
  });

  it("escapes a quote instead of breaking the row", () => {
    const csv = toCsv([{ ...row, lastName: 'Had"dad' }], false);
    expect(csv).toContain('"Had""dad"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("writes a header even with nothing to export", () => {
    const csv = toCsv([], false);
    expect(csv.split("\r\n")).toHaveLength(1);
    expect(csv).toContain("memberNumber");
  });

  it("renders a date as a day, not a timestamp", () => {
    expect(toCsv([row], false)).toContain('"2026-05-02"');
  });
});
