import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";

/** The relationship graph carries ids, not slugs. This resolves one to the other. */
export default async function InstitutionByIdPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const institution = await db.educationInstitution.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!institution) notFound();
  redirect(`/atlas/${institution.slug}`);
}
