// Settings an owner changes at runtime. Right now that is the two community
// links, which must be rotatable the moment one of them leaves the room.
//
// A link is never in code and never in a member-facing payload. It is read on
// the server, at the moment she asks for it, and handed to her once.
import type { Db } from "@/lib/db/client";

export const SETTING_KEYS = {
  // the quiet one: we speak, she reads
  circleAnnouncements: "circle.link.announcements",
  // the loud one: Roses speak to each other
  circleRoses: "circle.link.roses",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export type CircleGroup = "ANNOUNCEMENTS" | "ROSES";

export const GROUP_KEY: Record<CircleGroup, SettingKey> = {
  ANNOUNCEMENTS: SETTING_KEYS.circleAnnouncements,
  ROSES: SETTING_KEYS.circleRoses,
};

/**
 * Who may be handed a circle link. Written here, as a function, so the rule can
 * be tested rather than inferred from whether a button was rendered — the
 * button is decoration; this is the gate.
 */
export function mayReceiveCircleLink(member: {
  status: string;
  phoneVerified: boolean;
}): boolean {
  return member.status === "ACTIVE" && member.phoneVerified;
}

/**
 * Read a setting, falling back to the environment so a first deploy has links
 * before anyone has opened the atelier. The database always wins once set.
 */
export async function getSetting(db: Db, key: SettingKey): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key }, select: { value: true } });
  if (row?.value) return row.value;

  const fromEnv =
    key === SETTING_KEYS.circleRoses
      ? process.env.CIRCLE_LINK_ROSES
      : process.env.CIRCLE_LINK_ANNOUNCEMENTS;
  return fromEnv || null;
}

export async function setSetting(
  db: Db,
  key: SettingKey,
  value: string,
  updatedBy: string,
): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
}
