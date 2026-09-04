// /atelier/settings — owner only. An ADMIN who guesses the URL gets a 404,
// the same answer a stranger gets: we do not confirm the page exists.
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { AuthError, requireOwner } from "@/lib/auth/guards";
import { copy } from "@/content/copy";
import { getSetting, SETTING_KEYS } from "@/lib/settings";
import { saveText, setSequence } from "./actions";
import { TEXT_KEYS } from "./keys";

export default async function SettingsPage() {
  try {
    await requireOwner();
  } catch (err) {
    if (err instanceof AuthError) notFound();
    throw err;
  }

  const t = copy.atelier.settings;

  const [sequence, houseRules, privacy, terms, cities, announcements, roses] = await Promise.all([
    prisma.memberNumberSequence.findUnique({ where: { id: 1 } }),
    getSetting(prisma, TEXT_KEYS.houseRules),
    getSetting(prisma, TEXT_KEYS.privacy),
    getSetting(prisma, TEXT_KEYS.terms),
    getSetting(prisma, TEXT_KEYS.cities),
    getSetting(prisma, SETTING_KEYS.circleAnnouncements),
    getSetting(prisma, SETTING_KEYS.circleRoses),
  ]);

  const texts: { key: string; label: string; value: string | null; rows: number }[] = [
    { key: TEXT_KEYS.houseRules, label: t.houseRules, value: houseRules, rows: 8 },
    { key: TEXT_KEYS.privacy, label: t.privacy, value: privacy, rows: 10 },
    { key: TEXT_KEYS.terms, label: t.terms, value: terms, rows: 10 },
    { key: TEXT_KEYS.cities, label: t.flags, value: cities, rows: 3 },
  ];

  const links: { key: string; label: string; value: string | null }[] = [
    {
      key: SETTING_KEYS.circleAnnouncements,
      label: copy.atelier.circle.announcements,
      value: announcements,
    },
    { key: SETTING_KEYS.circleRoses, label: copy.atelier.circle.roses, value: roses },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-8 px-6 py-5" style={{ fontSize: "0.8rem" }}>
      <section className="flex flex-col gap-2">
        <span className="atelier-label">{t.sequence}</span>
        <form action={setSequence} className="flex items-end gap-2">
          <span style={{ color: "var(--chalk-dim)", letterSpacing: "0.25em" }}>
            {String((sequence?.current ?? 64) + 1).padStart(4, "0")}
          </span>
          <input
            className="atelier-input w-20"
            name="next"
            inputMode="numeric"
            aria-label={t.sequence}
          />
          <button type="submit" className="atelier-action">
            {t.save}
          </button>
        </form>
      </section>

      {links.map((link) => (
        <section key={link.key} className="flex flex-col gap-2">
          <span className="atelier-label">{link.label}</span>
          <form action={saveText} className="flex items-end gap-2">
            <input type="hidden" name="key" value={link.key} />
            <span style={{ color: "var(--chalk-dim)" }}>
              {link.value ? `${link.value.slice(0, 34)}…` : copy.atelier.circle.never}
            </span>
            <input className="atelier-input flex-1" name="value" type="url" aria-label={link.label} />
            <button type="submit" className="atelier-action">
              {t.save}
            </button>
          </form>
        </section>
      ))}

      {texts.map((text) => (
        <section key={text.key} className="flex flex-col gap-2">
          <span className="atelier-label">{text.label}</span>
          <form action={saveText} className="flex flex-col items-start gap-2">
            <input type="hidden" name="key" value={text.key} />
            <textarea
              className="atelier-input w-full"
              name="value"
              rows={text.rows}
              defaultValue={text.value ?? ""}
              aria-label={text.label}
            />
            <button type="submit" className="atelier-action">
              {t.save}
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
