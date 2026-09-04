// /atelier/messages — every message the system has sent, by its last three
// digits. The full number is not here and cannot be got here.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { atelierUser } from "../guard";
import { resendMessage, testSend } from "./actions";
import { TEMPLATES } from "./templates";

const stamp = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; status?: string; preview?: string }>;
}) {
  await atelierUser();
  const params = await searchParams;
  const t = copy.atelier.messages;

  const logs = await prisma.messageLog.findMany({
    where: {
      ...(params.template ? { templateKey: params.template } : {}),
      ...(params.status
        ? { status: params.status as "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED" }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      channel: true,
      status: true,
      templateKey: true,
      toRedacted: true,
      error: true,
      createdAt: true,
      memberId: true,
    },
  });

  const preview = params.preview ? TEMPLATES[params.preview] : undefined;

  return (
    <div className="flex flex-col gap-6 px-6 py-5">
      <section className="flex flex-wrap items-end gap-3">
        <form action="/atelier/messages" className="flex items-end gap-2">
          <select className="atelier-input" name="template" defaultValue={params.template ?? ""}>
            <option value="">{t.template}</option>
            {Object.keys(TEMPLATES).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <select className="atelier-input" name="status" defaultValue={params.status ?? ""}>
            <option value="">{t.status}</option>
            {["QUEUED", "SENT", "DELIVERED", "FAILED", "SKIPPED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="atelier-action">
            {copy.atelier.members.apply}
          </button>
        </form>

        <form action="/atelier/messages" className="flex items-end gap-2">
          <select className="atelier-input" name="preview" defaultValue={params.preview ?? ""}>
            {Object.keys(TEMPLATES).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <button type="submit" className="atelier-action">
            {t.preview}
          </button>
        </form>

        <form action={testSend} className="flex items-end gap-2">
          <input type="hidden" name="template" value={params.preview ?? "otp"} />
          <input className="atelier-input" name="to" aria-label={t.to} required />
          <button type="submit" className="atelier-action">
            {t.testSend}
          </button>
        </form>

        <Link href="/atelier/messages" className="atelier-action">
          {copy.atelier.members.clear}
        </Link>
      </section>

      {preview ? (
        <pre
          className="whitespace-pre-wrap p-4"
          style={{
            border: "1px solid rgba(232, 226, 214, 0.08)",
            color: "var(--chalk-dim)",
            fontSize: "0.8rem",
          }}
        >
          {preview.render()}
        </pre>
      ) : null}

      <table className="atelier-table">
        <thead>
          <tr>
            <th>{t.when}</th>
            <th>{t.template}</th>
            <th>{t.channel}</th>
            <th>{t.to}</th>
            <th>{t.status}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{stamp(log.createdAt)}</td>
              <td>{log.templateKey}</td>
              <td className="atelier-label">{log.channel}</td>
              <td className="atelier-label">{log.toRedacted}</td>
              <td>
                {log.status}
                {log.error ? ` · ${log.error}` : ""}
              </td>
              <td>
                {log.status === "FAILED" && log.memberId ? (
                  <form action={resendMessage}>
                    <input type="hidden" name="id" value={log.id} />
                    <button type="submit" className="atelier-action">
                      {t.resend}
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ color: "var(--chalk-dim)" }}>
                {t.empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
