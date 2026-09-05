import "server-only";
import { db } from "@/lib/db";
import { scoreUniverse } from "@/server/scoring";
import { networkAdvantage } from "@/server/relationships";
import { stageDurations } from "@/server/deals";

export async function pipelineAnalytics() {
  const [deals, opportunities, universe, mandates, interactions, advantage] = await Promise.all([
    db.deal.findMany({
      where: { deletedAt: null },
      include: { stageHistory: { orderBy: { enteredAt: "asc" } } },
    }),
    db.opportunity.findMany({ where: { deletedAt: null } }),
    scoreUniverse(),
    db.investorMandate.findMany({ include: { organisation: { select: { name: true, type: true } } } }),
    db.interaction.findMany({ select: { date: true, type: true } }),
    networkAdvantage(),
  ]);

  const live = deals.filter((d) => !["CLOSED", "LOST"].includes(d.stage));

  // ── Mandates by stage ─────────────────────────────────────────────────────
  const byStage = new Map<string, { count: number; ev: number }>();
  for (const d of live) {
    const entry = byStage.get(d.stage) ?? { count: 0, ev: 0 };
    entry.count += 1;
    entry.ev += d.expectedEv ?? 0;
    byStage.set(d.stage, entry);
  }

  // ── Average days in each stage, across every deal that has left it ────────
  const stageDays = new Map<string, number[]>();
  for (const d of deals) {
    for (const s of stageDurations(d.stageHistory)) {
      if (s.current) continue;
      const list = stageDays.get(s.stage) ?? [];
      list.push(s.days);
      stageDays.set(s.stage, list);
    }
  }

  // ── Origination by source ─────────────────────────────────────────────────
  const bySource = new Map<string, { count: number; ev: number }>();
  for (const o of opportunities) {
    const entry = bySource.get(o.source) ?? { count: 0, ev: 0 };
    entry.count += 1;
    entry.ev += o.estimatedEvHigh ?? 0;
    bySource.set(o.source, entry);
  }

  // ── Conversion through the funnel ─────────────────────────────────────────
  const ORDER = ["LEAD", "QUALIFIED", "MANDATE_DISCUSSION", "ENGAGED"];
  const reached = new Map<string, number>();
  for (const stage of ORDER) reached.set(stage, 0);
  const rank = (stage: string) => ORDER.indexOf(stage);
  for (const o of opportunities) {
    const r = rank(o.stage);
    // An opportunity that reached a stage necessarily passed through the ones
    // before it, so count it against each.
    const effective = r === -1 ? ORDER.length - 1 : r;
    for (let i = 0; i <= effective; i++) {
      reached.set(ORDER[i]!, (reached.get(ORDER[i]!) ?? 0) + 1);
    }
  }
  const conversion = ORDER.map((stage, i) => {
    const count = reached.get(stage) ?? 0;
    const previous = i === 0 ? count : (reached.get(ORDER[i - 1]!) ?? 0);
    return { stage, count, rate: previous > 0 ? count / previous : 0 };
  });

  // ── Geography and segment ─────────────────────────────────────────────────
  const byCountry = new Map<string, { count: number; ev: number; students: number }>();
  const bySegment = new Map<string, { count: number; ev: number }>();
  for (const i of universe) {
    const c = byCountry.get(i.country) ?? { count: 0, ev: 0, students: 0 };
    c.count += 1;
    c.ev += i.enterpriseValueHigh;
    c.students += i.students ?? 0;
    byCountry.set(i.country, c);

    const s = bySegment.get(i.type) ?? { count: 0, ev: 0 };
    s.count += 1;
    s.ev += i.enterpriseValueHigh;
    bySegment.set(i.type, s);
  }

  // ── Score distribution ────────────────────────────────────────────────────
  const bands = [
    { label: "80–100", min: 80, max: 101 },
    { label: "70–79", min: 70, max: 80 },
    { label: "60–69", min: 60, max: 70 },
    { label: "50–59", min: 50, max: 60 },
    { label: "Below 50", min: 0, max: 50 },
  ].map((b) => ({
    ...b,
    count: universe.filter((i) => i.displayScore >= b.min && i.displayScore < b.max).length,
  }));

  // ── Relationship activity by month ────────────────────────────────────────
  const months = new Map<string, number>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.set(d.toISOString().slice(0, 7), 0);
  }
  for (const i of interactions) {
    const key = i.date.toISOString().slice(0, 7);
    if (months.has(key)) months.set(key, (months.get(key) ?? 0) + 1);
  }

  return {
    headline: {
      pipelineEv: live.reduce((a, d) => a + (d.expectedEv ?? 0), 0),
      weightedFees: Math.round(
        live.reduce((a, d) => a + (d.expectedFee ?? 0) * (d.probability ?? 0), 0),
      ),
      originationEv: opportunities.reduce((a, o) => a + (o.estimatedEvHigh ?? 0), 0),
      activeMandates: mandates.filter((m) => m.isActive).length,
      universeEv: universe.reduce((a, i) => a + i.enterpriseValueHigh, 0),
      institutions: universe.length,
    },
    byStage: [...byStage.entries()].map(([stage, v]) => ({ stage, ...v })),
    stageDays: [...stageDays.entries()].map(([stage, days]) => ({
      stage,
      average: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
      samples: days.length,
    })),
    bySource: [...bySource.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.count - a.count),
    conversion,
    byCountry: [...byCountry.entries()]
      .map(([country, v]) => ({ country, ...v }))
      .sort((a, b) => b.ev - a.ev),
    bySegment: [...bySegment.entries()]
      .map(([segment, v]) => ({ segment, ...v }))
      .sort((a, b) => b.count - a.count),
    scoreBands: bands,
    activity: [...months.entries()].map(([month, count]) => ({ month, count })),
    investorActivity: mandates
      .map((m) => ({
        name: m.organisation.name,
        type: m.organisation.type,
        active: m.isActive,
        lastConfirmed: m.lastConfirmed,
      }))
      .sort((a, b) => Number(b.active) - Number(a.active)),
    advantage,
  };
}

/** Field-level data quality across the Atlas. */
export async function dataQuality() {
  const evidence = await db.dataFieldEvidence.findMany({
    where: { entityType: "EducationInstitution" },
    include: { source: { select: { name: true } } },
  });

  const byField = new Map<
    string,
    { total: number; verified: number; stale: number; unverified: number }
  >();
  const YEAR = 365 * 86_400_000;

  for (const e of evidence) {
    const entry = byField.get(e.field) ?? { total: 0, verified: 0, stale: 0, unverified: 0 };
    entry.total += 1;
    if (e.confidence === "VERIFIED") entry.verified += 1;
    if (e.confidence === "UNVERIFIED") entry.unverified += 1;
    if (!e.lastReviewed || Date.now() - e.lastReviewed.getTime() > YEAR) entry.stale += 1;
    byField.set(e.field, entry);
  }

  const bySource = new Map<string, number>();
  for (const e of evidence) {
    const name = e.source?.name ?? "Unattributed";
    bySource.set(name, (bySource.get(name) ?? 0) + 1);
  }

  const byAssertion = {
    FACT: evidence.filter((e) => e.assertion === "FACT").length,
    ESTIMATE: evidence.filter((e) => e.assertion === "ESTIMATE").length,
    SIGNAL: evidence.filter((e) => e.assertion === "SIGNAL").length,
    TERRA_HYPOTHESIS: evidence.filter((e) => e.assertion === "TERRA_HYPOTHESIS").length,
  };

  return {
    total: evidence.length,
    stale: evidence.filter(
      (e) => !e.lastReviewed || Date.now() - e.lastReviewed.getTime() > YEAR,
    ).length,
    byField: [...byField.entries()]
      .map(([field, v]) => ({ field, ...v }))
      .sort((a, b) => b.stale - a.stale),
    bySource: [...bySource.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    byAssertion,
  };
}

export async function recentAudit(limit = 60) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, role: true } } },
  });
}

export async function teamRoster() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { ownedOpportunities: true, ledDeals: true, ownedRelationships: true } },
    },
  });
}
