// server-side role guards — the single place access is enforced. No route checks role inline.
// Guards throw a typed AuthError; route handlers map it to 404 ("NOTHING HERE."),
// never 403 — we do not confirm that a protected route exists.
import "server-only";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

export class AuthError extends Error {
  constructor(readonly code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  phoneVerified: boolean;
  memberId?: string;
}

async function sessionUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) throw new AuthError("UNAUTHENTICATED");
  return user;
}

function requireRole(user: SessionUser, roles: Role[]): SessionUser {
  if (!roles.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function requireMember(): Promise<SessionUser> {
  return requireRole(await sessionUser(), ["MEMBER", "ADMIN", "OWNER"]);
}

export async function requireVerifiedPhone(): Promise<SessionUser> {
  const user = await requireMember();
  if (!user.phoneVerified) throw new AuthError("FORBIDDEN");
  return user;
}

export async function requireDoor(): Promise<SessionUser> {
  return requireRole(await sessionUser(), ["DOOR", "ADMIN", "OWNER"]);
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = requireRole(await sessionUser(), ["ADMIN", "OWNER"]);
  // /atelier carries a second lock: an explicit email allowlist from env
  const allowlist = (process.env.ATELIER_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.includes(user.email.toLowerCase())) throw new AuthError("FORBIDDEN");
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireAdmin();
  return requireRole(user, ["OWNER"]);
}
