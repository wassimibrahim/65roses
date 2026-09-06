// invitation messages — composed only from index, name, city and the link.
// The venue cannot appear here by construction; the test in messages.test.ts holds the line.
import { copy, fill } from "./copy";

export function invitationMessages(
  night: { index: string; name: string; slug: string },
  appUrl: string,
) {
  const link = `${appUrl}/rose/nights/${night.slug}`;
  return {
    sms: fill(copy.sms.invitation, { index: night.index, name: night.name, link }),
    email: {
      subject: fill(copy.email.invitation.subject, { index: night.index }),
      text: [
        ...copy.email.invitation.lines.map((l) =>
          fill(l, { index: night.index, name: night.name }),
        ),
        "",
        `${copy.email.invitation.action}`,
        link,
      ].join("\n"),
    },
  };
}
