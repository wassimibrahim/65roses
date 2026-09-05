import { requireUser } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { loadContacts } from "@/server/relationships";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();
  const contacts = (await loadContacts()).filter((c) => !c.isInternal);

  // Contact detail is personal data; every export of it is recorded.
  await recordAudit({
    userId: user.id,
    action: "EXPORT",
    entityType: "Person",
    entityId: "contacts-export",
    context: `${contacts.length} contacts`,
  });

  const csv = toCsv(
    contacts.map((c) => ({
      Name: c.name,
      Title: c.title,
      Organisation: c.organisation,
      Location: c.location,
      Languages: c.languages.join("; "),
      "Terra relationship (1-5)": c.strength,
      "Relationship owner": c.owner,
      "Last contact": c.lastInteractionAt,
      "Next follow-up": c.nextFollowUpAt,
      Interactions: c.interactionCount,
    })),
  );

  return csvResponse(csv, `terra-contacts-${new Date().toISOString().slice(0, 10)}.csv`);
}
