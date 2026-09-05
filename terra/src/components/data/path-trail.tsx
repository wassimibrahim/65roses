import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { IntroductionPath } from "@/lib/engine/graph";
import { humanise } from "@/lib/utils";

const HREF: Record<string, (id: string) => string> = {
  person: (id) => `/relationships/person/${id}`,
  organisation: (id) => `/investors/id/${id}`,
  institution: (id) => `/atlas/id/${id}`,
};

/** "Fouad → Elena Vidal → Ignacio Serra → Colegio Monteverde" */
export function PathTrail({ path }: { path: IntroductionPath }) {
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {path.steps.map((step, index) => (
          <li key={`${step.node.id}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <ArrowRight className="size-2.5 shrink-0 text-stone-light" /> : null}
            <span className="inline-flex flex-col">
              <Link
                href={HREF[step.node.kind]!(step.node.id)}
                className="text-[12px] text-ink underline-offset-4 hover:underline"
              >
                {step.node.label}
              </Link>
              {step.viaEdge ? (
                <span className="text-[9.5px] text-stone">
                  {humanise(step.viaEdge.kind)} · strength {step.viaEdge.strength}
                </span>
              ) : (
                <span className="text-[9.5px] text-stone">Terra</span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[10.5px] text-stone">
        {path.degree === 1 ? "Direct" : `${path.degree} hops`} · weakest link {path.weakestLink} of 5
      </p>
    </div>
  );
}
