// atelier access — any failure is a 404. The route's existence is never confirmed.
import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin, type SessionUser } from "@/lib/auth/guards";

export async function atelierUser(): Promise<SessionUser> {
  try {
    return await requireAdmin();
  } catch {
    notFound();
  }
}
