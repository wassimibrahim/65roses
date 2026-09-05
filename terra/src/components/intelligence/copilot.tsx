"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, CornerDownLeft } from "lucide-react";
import { askTerra, type QueryResult } from "@/server/intelligence";
import { EXAMPLE_QUESTIONS } from "@/lib/intelligence-questions";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

/**
 * Terra Intelligence. Deliberately not the centre of the application — a
 * question box that returns a checkable answer, with the criteria it applied
 * shown alongside the result.
 */
export function Copilot() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(value: string) {
    setQuestion(value);
    setError(null);
    startTransition(async () => {
      try {
        setResult(await askTerra(value));
      } catch {
        setError("That question could not be answered.");
      }
    });
  }

  return (
    <Panel>
      <PanelHeader
        title="Terra Intelligence"
        meta="Answers come from Terra's own records"
        action={
          result ? (
            <Badge tone="quiet" mono>
              {result.provider === "deterministic" ? "Local query" : "External model"}
            </Badge>
          ) : null
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) run(question);
        }}
        className="flex items-center gap-2.5 border-b border-rule-soft px-4"
      >
        <Search className="size-3.5 shrink-0 text-stone" strokeWidth={1.6} />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about institutions, mandates, relationships or transactions…"
          aria-label="Ask Terra Intelligence"
          className="h-11 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-stone-light"
        />
        {pending ? (
          <span className="eyebrow shrink-0">Querying</span>
        ) : (
          <CornerDownLeft className="size-3 shrink-0 text-stone-light" />
        )}
      </form>

      {!result && !pending ? (
        <PanelBody>
          <div className="eyebrow mb-2">Try</div>
          <ul className="space-y-1">
            {EXAMPLE_QUESTIONS.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => run(example)}
                  className="text-left text-[12px] leading-relaxed text-graphite underline-offset-4 hover:text-ink hover:underline"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-rule-soft pt-3 text-[10.5px] leading-relaxed text-stone">
            This layer resolves questions deterministically against the internal database. Every
            answer shows the criteria it applied, so it can be checked. Confidential data is never
            sent to an external model unless that is explicitly configured.
          </p>
        </PanelBody>
      ) : null}

      {error ? (
        <PanelBody>
          <p role="alert" className="text-[12px] text-burgundy">
            {error}
          </p>
        </PanelBody>
      ) : null}

      {result ? (
        <>
          <PanelBody className="border-b border-rule-soft">
            <p className="display text-[16px] leading-snug text-ink">{result.headline}</p>
            {result.interpretation ? (
              <p className="mt-1 text-[11.5px] text-stone">{result.interpretation}</p>
            ) : null}
            {result.criteria.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.criteria.map((c) => (
                  <Badge key={c} tone="neutral" mono>
                    {c}
                  </Badge>
                ))}
              </div>
            ) : null}
            {result.suggestion ? (
              <p className="mt-3 max-w-2xl text-[11.5px] leading-relaxed text-graphite">
                {result.suggestion}
              </p>
            ) : null}
          </PanelBody>

          {result.rows.length > 0 ? (
            <ul className="max-h-[460px] overflow-y-auto">
              {result.rows.map((row, index) => (
                <li key={`${row.label}-${index}`} className="border-b border-rule-soft last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      {row.href ? (
                        <Link href={row.href} className="text-[12.5px] text-ink hover:underline">
                          {row.label}
                        </Link>
                      ) : (
                        <span className="text-[12.5px] text-ink">{row.label}</span>
                      )}
                      {row.sublabel ? (
                        <span className="block text-[10.5px] text-stone">{row.sublabel}</span>
                      ) : null}
                    </span>
                    <span className="flex flex-wrap gap-x-5 gap-y-1">
                      {row.values.map((v) => (
                        <span key={v.key} className="text-right">
                          <span className="eyebrow block">{v.key}</span>
                          <span className="num text-[11.5px] text-graphite">{v.value}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}
