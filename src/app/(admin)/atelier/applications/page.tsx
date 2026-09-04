// /atelier/applications — the review queue. Row click opens a detail panel beside the
// table. Every detail open reads PII and therefore writes a pii.read audit row.
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { copy } from "@/content/copy";
import { atelierUser } from "../guard";
import {
  addApplicationNote,
  approveApplication,
  declineApplication,
  waitlistApplication,
} from "./actions";
import { CopyDm } from "./CopyDm";
import type { ApplicationStatus } from "@prisma/client";

const FILTERS: { key: string; value: ApplicationStatus | null; label: string }[] = [
  { key: "all", value: null, label: copy.atelier.applications.filters.all },
  { key: "pending", value: "PENDING", label: copy.atelier.applications.filters.pending },
  { key: "approved", value: "APPROVED", label: copy.atelier.applications.filters.approved },
  { key: "waitlist", value: "WAITLIST", label: copy.atelier.applications.filters.waitlist },
  { key: "declined", value: "DECLINED", label: copy.atelier.applications.filters.declined },
];

function age(dateOfBirth: Date): number {
  const now = new Date();
  let years = now.getFullYear() - dateOfBirth.getFullYear();
  const anniversary = new Date(dateOfBirth);
  anniversary.setFullYear(now.getFullYear());
  if (anniversary.getTime() > now.getTime()) years -= 1;
  return years;
}

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; id?: string }>;
}) {
  const admin = await atelierUser();
  const params = await searchParams;
  const filter = FILTERS.find((f) => f.key === params.status) ?? FILTERS[0]!;
  const q = params.q?.trim() ?? "";

  const applications = await prisma.application.findMany({
    where: {
      deletedAt: null,
      ...(filter.value ? { status: filter.value } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { instagramHandle: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ referredById: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      instagramHandle: true,
      dateOfBirth: true,
      city: true,
      area: true,
      referralCode: true,
      status: true,
    },
  });

  const detail = params.id
    ? await prisma.application.findUnique({
        where: { id: params.id },
        include: {
          referredBy: { select: { id: true, memberNumber: true, firstName: true } },
          member: { select: { memberNumber: true } },
          notes: { orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  if (detail) {
    // the panel shows her phone — that read leaves a trace
    await audit(prisma, {
      action: "pii.read",
      entityType: "Application",
      entityId: detail.id,
      actorId: admin.id,
      after: { fields: ["phone", "email", "dateOfBirth"] },
    });
  }

  const trail = detail
    ? await prisma.auditLog.findMany({
        where: { entityType: "Application", entityId: detail.id, NOT: { action: "pii.read" } },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  const keep = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    return `/atelier/applications${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-0 lg:flex-row">
      <div className="min-w-0 flex-1 px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={keep({ status: f.key === "all" ? "" : f.key, id: params.id ?? "" })}
              style={{
                color: f.key === filter.key ? "var(--chalk)" : "var(--chalk-dim)",
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
              }}
            >
              {f.label}
            </Link>
          ))}
          <form action="/atelier/applications" className="ml-auto">
            {params.status ? <input type="hidden" name="status" value={params.status} /> : null}
            <input
              className="atelier-input"
              type="search"
              name="q"
              defaultValue={q}
              aria-label={copy.atelier.applications.search}
            />
          </form>
        </div>

        <table className="atelier-table">
          <thead>
            <tr>
              <th>{copy.atelier.applications.columns.date}</th>
              <th>{copy.atelier.applications.columns.name}</th>
              <th>{copy.atelier.applications.columns.handle}</th>
              <th>{copy.atelier.applications.columns.age}</th>
              <th>{copy.atelier.applications.columns.city}</th>
              <th>{copy.atelier.applications.columns.referral}</th>
              <th>{copy.atelier.applications.columns.status}</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} style={app.id === params.id ? { background: "#16090b" } : undefined}>
                <td>{fmt(app.createdAt)}</td>
                <td>
                  <Link href={keep({ id: app.id })}>
                    {app.firstName} {app.lastName}
                  </Link>
                </td>
                <td>
                  <a
                    href={`https://instagram.com/${app.instagramHandle}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{app.instagramHandle}
                  </a>
                </td>
                <td>{age(app.dateOfBirth)}</td>
                <td>{app.area ?? app.city}</td>
                <td>{app.referralCode ?? "—"}</td>
                <td>{app.status}</td>
              </tr>
            ))}
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: "var(--chalk-dim)" }}>
                  {copy.atelier.applications.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detail ? (
        <aside
          className="w-full shrink-0 px-6 py-5 lg:w-[26rem]"
          style={{ borderLeft: "1px solid rgba(232, 226, 214, 0.08)" }}
        >
          <div className="flex flex-col gap-4" style={{ fontSize: "0.8rem" }}>
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: "1rem" }}>
                {detail.firstName} {detail.lastName}
              </span>
              <Link href={keep({ id: "" })} style={{ color: "var(--chalk-dim)" }}>
                ×
              </Link>
            </div>

            <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5">
              <dt className="atelier-label">{copy.atelier.applications.columns.status}</dt>
              <dd>{detail.status}</dd>
              <dt className="atelier-label">{copy.atelier.applications.columns.handle}</dt>
              <dd>
                <a
                  href={`https://instagram.com/${detail.instagramHandle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{detail.instagramHandle}
                </a>
              </dd>
              <dt className="atelier-label">{copy.enter.email}</dt>
              <dd>{detail.email}</dd>
              <dt className="atelier-label">{copy.apply.fields.mobile}</dt>
              <dd>{detail.phone}</dd>
              <dt className="atelier-label">{copy.apply.fields.dateOfBirth}</dt>
              <dd>
                {fmt(detail.dateOfBirth)} · {age(detail.dateOfBirth)}
              </dd>
              <dt className="atelier-label">{copy.atelier.applications.columns.city}</dt>
              <dd>{[detail.area, detail.city].filter(Boolean).join(", ")}</dd>
              <dt className="atelier-label">{copy.apply.fields.howFound}</dt>
              <dd>{detail.howFound ?? "—"}</dd>
              <dt className="atelier-label">{copy.atelier.applications.columns.referral}</dt>
              <dd>
                {detail.referredBy
                  ? `${detail.referredBy.memberNumber} · ${detail.referredBy.firstName}`
                  : (detail.referralCode ?? "—")}
              </dd>
              <dt className="atelier-label">{copy.atelier.applications.consent}</dt>
              <dd>
                {[
                  detail.confirmedAdult && copy.apply.consent.adult,
                  detail.agreedHouseRules && copy.apply.consent.houseRules,
                  detail.consentMessaging && copy.apply.consent.messaging,
                  detail.consentPrivacy && copy.apply.consent.privacy,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {detail.consentAt ? ` · ${fmt(detail.consentAt)} · ${detail.consentIp}` : null}
              </dd>
            </dl>

            {detail.status === "APPROVED" && detail.member ? (
              <div className="flex flex-col gap-2">
                <span className="atelier-label">{copy.atelier.applications.number}</span>
                <span style={{ letterSpacing: "0.3em" }}>{detail.member.memberNumber}</span>
                {detail.welcomeToken ? (
                  <>
                    <span className="atelier-label">{copy.atelier.applications.welcome}</span>
                    <span className="break-all" style={{ color: "var(--chalk-dim)" }}>
                      {process.env.NEXT_PUBLIC_APP_URL}/welcome?t={detail.welcomeToken}
                    </span>
                    <div>
                      <CopyDm
                        memberNumber={detail.member.memberNumber}
                        welcomeUrl={`${process.env.NEXT_PUBLIC_APP_URL}/welcome?t=${detail.welcomeToken}`}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <form action={approveApplication} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={detail.id} />
                  <input
                    className="atelier-input w-20"
                    name="numberOverride"
                    inputMode="numeric"
                    pattern="\d{4}"
                    aria-label={copy.atelier.applications.number}
                  />
                  <button type="submit" className="atelier-action">
                    {copy.atelier.applications.approve}
                  </button>
                </form>
                <form action={waitlistApplication}>
                  <input type="hidden" name="id" value={detail.id} />
                  <button type="submit" className="atelier-action">
                    {copy.atelier.applications.waitlist}
                  </button>
                </form>
                <form action={declineApplication}>
                  <input type="hidden" name="id" value={detail.id} />
                  <button type="submit" className="atelier-action">
                    {copy.atelier.applications.decline}
                  </button>
                </form>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="atelier-label">{copy.atelier.applications.notes}</span>
              <form action={addApplicationNote} className="flex gap-2">
                <input type="hidden" name="id" value={detail.id} />
                <input className="atelier-input flex-1" name="body" maxLength={2000} />
                <button type="submit" className="atelier-action">
                  {copy.atelier.applications.addNote}
                </button>
              </form>
              {detail.notes.map((note) => (
                <div key={note.id} style={{ color: "var(--chalk-dim)" }}>
                  {fmt(note.createdAt)} — {note.body}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="atelier-label">{copy.atelier.applications.trail}</span>
              {trail.map((row) => (
                <div key={row.id} style={{ color: "var(--chalk-dim)" }}>
                  {fmt(row.createdAt)} — {row.action}
                </div>
              ))}
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
