import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string | null;
  initials?: string | null;
}

/**
 * The single server-side guard. Authorisation is decided here and nowhere
 * else — never inside a component, never in the browser.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
    title: session.user.title,
    initials: session.user.initials,
  };
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
    title: session.user.title,
    initials: session.user.initials,
  };
}

const RANK: Record<Role, number> = {
  ANALYST: 1,
  ASSOCIATE: 2,
  PARTNER: 3,
  MANAGING_PARTNER: 4,
  ADMIN: 4,
};

export function atLeast(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export async function requireRole(minimum: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!atLeast(user.role, minimum)) redirect("/command?denied=1");
  return user;
}

/** Partner-confidential notes and restricted deals are gated on this. */
export function canSeeConfidential(role: Role): boolean {
  return atLeast(role, "PARTNER");
}

export const ROLE_LABELS: Record<Role, string> = {
  MANAGING_PARTNER: "Managing Partner",
  PARTNER: "Partner",
  ASSOCIATE: "Associate",
  ANALYST: "Analyst",
  ADMIN: "Administrator",
};
