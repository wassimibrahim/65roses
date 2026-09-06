// /apply — being considered, not signing up
import { Suspense } from "react";
import { ApplyFlow } from "./ApplyFlow";

export default function ApplyPage() {
  return (
    <Suspense>
      <ApplyFlow />
    </Suspense>
  );
}
