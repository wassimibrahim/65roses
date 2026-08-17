// /atelier — opens on the applications queue
import { redirect } from "next/navigation";
import { atelierUser } from "./guard";

export default async function AtelierPage() {
  await atelierUser();
  redirect("/atelier/applications");
}
