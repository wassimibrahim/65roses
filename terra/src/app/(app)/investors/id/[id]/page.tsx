import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";

export default async function OrganisationByIdPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const org = await db.organisation.findUnique({ where: { id }, select: { slug: true } });
  if (!org) notFound();
  redirect(`/investors/${org.slug}`);
}
