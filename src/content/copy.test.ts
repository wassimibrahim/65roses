// enforcement: no JSX text node longer than 2 characters may appear in src/app or
// src/components unless the string lives in copy.ts. The /system dev wall is whitelisted.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { copy } from "./copy";

const ROOTS = ["src/app", "src/components"];
const WHITELIST = [/^src\/app\/\(dev\)\//];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

function allCopyStrings(node: unknown, into: Set<string>): Set<string> {
  if (typeof node === "string") {
    into.add(node);
    node.split("\n").forEach((line) => into.add(line.trim()));
  } else if (Array.isArray(node)) {
    node.forEach((child) => allCopyStrings(child, into));
  } else if (node && typeof node === "object") {
    Object.values(node).forEach((child) => allCopyStrings(child, into));
  }
  return into;
}

// JSX text nodes: raw text sitting between a closing ">" and the next "<".
function jsxTextNodes(source: string): string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const nodes: string[] = [];
  const re = />([^<>{}]+)</g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutComments)) !== null) {
    const text = (match[1] ?? "")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length <= 2) continue;
    if (!/[a-zA-Z]/.test(text)) continue; // numbers, serials, glyphs are fine
    nodes.push(text);
  }
  return nodes;
}

describe("the copy law", () => {
  const allowed = allCopyStrings(copy, new Set<string>());

  it("every JSX text node comes from copy.ts", () => {
    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of tsxFiles(root)) {
        const rel = relative(".", file).replaceAll("\\", "/");
        if (WHITELIST.some((pattern) => pattern.test(rel))) continue;

        for (const text of jsxTextNodes(readFileSync(file, "utf8"))) {
          if (!allowed.has(text)) offenders.push(`${rel}: "${text}"`);
        }
      }
    }

    expect(offenders, `hardcoded strings found:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("no forbidden word appears anywhere in the voice", () => {
    const forbidden =
      /\b(VIP|elite|premium|exclusive|luxury|upscale|bespoke|guestlist|early bird|bottle service|dress code)\b/i;
    for (const value of allowed) {
      expect(value).not.toMatch(forbidden);
    }
  });
});
