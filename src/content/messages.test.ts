// the invitation can never carry the venue — by construction, and by assertion
import { describe, expect, it } from "vitest";
import { invitationMessages } from "./messages";

describe("invitation messages", () => {
  it("contain the night and the link, never a venue", () => {
    const { sms, email } = invitationMessages(
      { index: "001", name: "SERENA", slug: "serena" },
      "https://65roses.com",
    );
    expect(sms).toBe("001 — SERENA. 00—05. https://65roses.com/rose/nights/serena");
    expect(email.subject).toBe("001");
    expect(email.text).toContain("SERENA");
    expect(email.text).toContain("ARE YOU COMING?");
    for (const banned of ["WAREHOUSE", "Karantina", "venue", "address"]) {
      expect(sms.toLowerCase()).not.toContain(banned.toLowerCase());
      expect(email.text.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});
