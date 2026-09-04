// The templates, listed once, with the fake values a preview renders them
// against. This lives outside actions.ts because a "use server" module may
// only export functions — and because a catalogue is not an action.
import { copy, fill } from "@/content/copy";

// every template the system can send, with the fake values a preview uses
export const TEMPLATES: Record<string, { render: () => string; channel: "SMS" | "EMAIL" }> = {
  otp: { channel: "SMS", render: () => fill(copy.sms.otp, { code: "482173" }) },
  invitation: {
    channel: "SMS",
    render: () =>
      fill(copy.sms.invitation, {
        index: "001",
        name: "SERENA",
        link: "https://65.example/rose/nights/serena",
      }),
  },
  door_code: {
    channel: "SMS",
    render: () => fill(copy.sms.doorCode, { name: "SERENA", code: "4821" }),
  },
  venue: {
    channel: "SMS",
    render: () => fill(copy.sms.venue, { name: "SERENA", venue: "THE APARTMENT, MAR MIKHAEL" }),
  },
  stem_link: {
    channel: "SMS",
    render: () =>
      fill(copy.sms.stemLink, { name: "SERENA", link: "https://65.example/s/AX7K9QW2LM" }),
  },
  stem_paid: { channel: "SMS", render: () => fill(copy.sms.stemPaid, { name: "KARIM" }) },
  delivered: { channel: "SMS", render: () => copy.sms.delivered },
  missed_you: { channel: "SMS", render: () => copy.sms.missedYou },
  still_with_us: { channel: "SMS", render: () => copy.sms.stillWithUs },
  rose_quiet: { channel: "SMS", render: () => copy.sms.roseQuiet },
  awake_again: { channel: "SMS", render: () => copy.sms.awakeAgain },
  applied: { channel: "EMAIL", render: () => copy.email.applied.lines.join("\n") },
  approval: { channel: "EMAIL", render: () => copy.email.approval.lines.join("\n") },
};

