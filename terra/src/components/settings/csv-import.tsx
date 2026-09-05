"use client";

import { useState, useTransition } from "react";
import { Upload, AlertTriangle, Check } from "lucide-react";
import { previewImport, commitImport, type PreviewResult } from "@/app/actions/import";
import { COLUMN_SPECS, type ImportKind } from "@/lib/import";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { NativeSelect, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const KINDS: { key: ImportKind; label: string }[] = [
  { key: "institutions", label: "Schools" },
  { key: "contacts", label: "Contacts" },
  { key: "investors", label: "Investors" },
  { key: "transactions", label: "Transactions" },
];

export function CsvImport() {
  const [kind, setKind] = useState<ImportKind>("institutions");
  const [csv, setCsv] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [committed, setCommitted] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const specs = COLUMN_SPECS[kind];

  async function onFile(file: File) {
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    setCommitted(null);
    startTransition(async () => {
      const preview = await previewImport({ kind, csv: text });
      setResult(preview);
      if (preview.mapping) setMapping(preview.mapping);
    });
  }

  function remap(field: string, column: number | null) {
    const next = { ...mapping, [field]: column };
    setMapping(next);
    startTransition(async () => {
      const preview = await previewImport({ kind, csv, mapping: next });
      setResult(preview);
    });
  }

  function commit() {
    startTransition(async () => {
      const outcome = await commitImport({ kind, csv, mapping });
      setCommitted(
        outcome.ok
          ? `${outcome.staged} of ${outcome.total} rows staged. ${outcome.note}`
          : (outcome.error ?? "Import failed."),
      );
    });
  }

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader title="Source" meta="CSV, comma-separated, with a header row" />
        <PanelBody className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="import-kind">Import into</Label>
              <NativeSelect
                id="import-kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as ImportKind);
                  setResult(null);
                  setCommitted(null);
                }}
              >
                {KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <label className="inline-flex h-7.5 cursor-pointer items-center gap-1.5 rounded-sm border border-rule bg-ivory px-3 text-[12px] text-ink transition-colors hover:bg-paper">
              <Upload className="size-3.5" />
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                }}
              />
            </label>

            {fileName ? (
              <span className="text-[11.5px] text-stone">
                {fileName}
                {result?.sampleSize ? ` · ${result.sampleSize} rows` : ""}
              </span>
            ) : null}
            {pending ? <span className="eyebrow">Validating</span> : null}
          </div>

          {result?.error ? (
            <p role="alert" className="text-[12px] text-burgundy">
              {result.error}
            </p>
          ) : null}
        </PanelBody>
      </Panel>

      {result?.ok && result.headers && result.validation ? (
        <>
          <Panel>
            <PanelHeader
              title="Column mapping"
              meta="Inferred from the headers; correct anything it got wrong"
            />
            <PanelBody>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {specs.map((spec) => (
                  <div key={spec.key}>
                    <Label>
                      {spec.label}
                      {spec.required ? <span className="ml-1 text-burgundy">*</span> : null}
                    </Label>
                    <NativeSelect
                      value={mapping[spec.key] ?? ""}
                      onChange={(e) =>
                        remap(spec.key, e.target.value === "" ? null : Number(e.target.value))
                      }
                      className="w-full"
                    >
                      <option value="">Not mapped</option>
                      {result.headers!.map((header, index) => (
                        <option key={`${header}-${index}`} value={index}>
                          {header}
                        </option>
                      ))}
                    </NativeSelect>
                    {spec.hint ? (
                      <p className="mt-0.5 text-[10px] text-stone">{spec.hint}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>

          <section className="grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-4">
            <Stat label="Rows" value={String(result.validation.rows.length)} />
            <Stat
              label="Will import"
              value={String(result.validation.importable)}
              tone={result.validation.importable > 0 ? "forest" : undefined}
            />
            <Stat
              label="Errors"
              value={String(result.validation.errors)}
              tone={result.validation.errors > 0 ? "burgundy" : undefined}
            />
            <Stat
              label="Duplicates"
              value={String(result.validation.duplicates)}
              tone={result.validation.duplicates > 0 ? "amber" : undefined}
            />
          </section>

          <Panel>
            <PanelHeader title="Preview" meta="First 40 rows as Terra will read them" />
            <div className="overflow-x-auto">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th className="w-8 text-right">#</th>
                    <th className="w-8" />
                    {specs
                      .filter((s) => mapping[s.key] !== null && mapping[s.key] !== undefined)
                      .map((s) => (
                        <th key={s.key}>{s.label}</th>
                      ))}
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {result.validation.rows.slice(0, 40).map((row) => {
                    const hasError = row.issues.some((i) => i.severity === "ERROR");
                    return (
                      <tr key={row.index} className={cn(hasError && "bg-burgundy-soft/40")}>
                        <td className="num text-right text-[10.5px] text-stone-light">
                          {row.index + 1}
                        </td>
                        <td>
                          {hasError ? (
                            <AlertTriangle className="size-3 text-burgundy" />
                          ) : row.duplicateOf ? (
                            <span className="text-[10px] text-amber">≡</span>
                          ) : (
                            <Check className="size-3 text-forest" />
                          )}
                        </td>
                        {specs
                          .filter((s) => mapping[s.key] !== null && mapping[s.key] !== undefined)
                          .map((s) => (
                            <td key={s.key} className="max-w-[160px] truncate text-[11.5px] text-graphite">
                              {row.values[s.key] || "—"}
                            </td>
                          ))}
                        <td className="max-w-[300px]">
                          {row.issues.length === 0 ? (
                            <span className="text-[10.5px] text-stone-light">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {row.issues.map((issue, i) => (
                                <li
                                  key={i}
                                  className={cn(
                                    "text-[10.5px] leading-snug",
                                    issue.severity === "ERROR" ? "text-burgundy" : "text-amber",
                                  )}
                                >
                                  {issue.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PanelBody className="flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft py-3">
              <p className="text-[11px] leading-relaxed text-stone">
                Rows with an error are never imported. Duplicates are held back rather than merged —
                a merge is a judgment, not a default.
              </p>
              <Button
                size="sm"
                onClick={commit}
                disabled={pending || result.validation.importable === 0}
              >
                Stage {result.validation.importable} rows
              </Button>
            </PanelBody>
          </Panel>
        </>
      ) : null}

      {committed ? (
        <Panel>
          <PanelBody>
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-forest" />
              <p className="text-[12px] leading-relaxed text-graphite">{committed}</p>
            </div>
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "forest" | "burgundy" | "amber";
}) {
  const colour =
    tone === "forest" ? "text-forest" : tone === "burgundy" ? "text-burgundy" : tone === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="bg-ivory px-3.5 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={cn("num mt-0.5 text-[14px]", colour)}>{value}</div>
    </div>
  );
}
