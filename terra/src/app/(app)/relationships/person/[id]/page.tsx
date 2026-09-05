import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";

export default async function PersonByIdPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const person = await db.person.findUnique({ where: { id }, select: { slug: true } });
  if (!person) notFound();
  redirect(`/relationships/${person.slug}`);
}
