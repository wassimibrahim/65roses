// /atelier/audit — the trail. Filterable, read-only, and with no delete on
// this page or anywhere behind it. A log an operator can edit is not a log.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { atelierUser } from "../guard";

const stamp = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; actor?: string; q?: string }>;
}) {
  await atelierUser();
  const params = await searchParams;
  const t = copy.atelier.audit;

  const [actions, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, take: 100 }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, take: 50 }),
  ]);

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(params.action ? { action: params.action } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.q ? { entityId: { contains: params.q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      before: true,
      after: true,
      ip: true,
      actor: { select: { email: true } },
    },
  });

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <form action="/atelier/audit" className="flex flex-wrap items-end gap-3">
        <select className="atelier-input" name="action" defaultValue={params.action ?? ""}>
          <option value="">{t.action}</option>
          {actions.map((a) => (
            <option key={a.action} value={a.action}>
              {a.action}
            </option>
          ))}
        </select>
        <select className="atelier-input" name="entityType" defaultValue={params.entityType ?? ""}>
          <option value="">{t.entity}</option>
          {entityTypes.map((e) => (
            <option key={e.entityType} value={e.entityType}>
              {e.entityType}
            </option>
          ))}
        </select>
        <input
          className="atelier-input"
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          aria-label={copy.atelier.applications.search}
        />
        <button type="submit" className="atelier-action">
          {copy.atelier.members.apply}
        </button>
        <Link href="/atelier/audit" className="atelier-action">
          {copy.atelier.members.clear}
        </Link>
      </form>

      <table className="atelier-table">
        <thead>
          <tr>
            <th>{t.when}</th>
            <th>{t.actor}</th>
            <th>{t.action}</th>
            <th>{t.entity}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{stamp(row.createdAt)}</td>
              <td className="atelier-label">{row.actor?.email ?? "—"}</td>
              <td>{row.action}</td>
              <td className="atelier-label">
                {row.entityType} {row.entityId.slice(0, 10)}
              </td>
              <td className="atelier-label" style={{ maxWidth: "28rem", overflow: "hidden" }}>
                {row.after ? JSON.stringify(row.after).slice(0, 160) : ""}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: "var(--chalk-dim)" }}>
                {t.empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
