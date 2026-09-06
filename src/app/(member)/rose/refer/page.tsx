// /rose/refer — KNOW A ROSE? One field. She never learns the outcome; that is the design.
import { redirect } from "next/navigation";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { ReferForm } from "./ReferForm";

export default async function ReferPage() {
  try {
    await requireVerifiedPhone();
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") redirect("/enter");
    redirect("/enter/verify");
  }
  return <ReferForm />;
}
