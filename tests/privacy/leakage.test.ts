// V2 — PII escaping sideways: into a log, into a URL, into an error.
//
// These are the leaks nobody designs and everybody ships. A phone number in a
// console line, a member id in a path, a Prisma error rendered to a visitor —
// each is a different accident, so each gets its own test.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { redactPhone } from "@/lib/providers/sms";
import { copy } from "@/content/copy";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(path)) out.push(path);
  }
  return out;
}

const source = walk("src").filter((f) => !f.includes(".test."));
const read = (f: string) => readFileSync(f, "utf8");

describe("logs", () => {
  it("redacts a phone to its last three digits, and never logs the whole one", () => {
    expect(redactPhone("+9613123456")).toBe("•••••456");
    expect(redactPhone("+9613123456")).not.toContain("9613123");
  });

  it("has no console call anywhere that takes a phone, an address, or a code", () => {
    const offenders: string[] = [];
    for (const file of source) {
      for (const line of read(file).split("\n")) {
        if (!/console\.(log|info|warn|error|debug)/.test(line)) continue;
        // the console SMS provider is the one deliberate logger, and it redacts
        if (file.includes("providers/sms/console") && line.includes("redactPhone")) continue;
        if (/\b(phone|addressLine|doorCode|otp|passwordHash|nfcUid)\b/.test(line)) {
          offenders.push(`${file}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("writes only a redacted recipient to MessageLog", () => {
    const sms = read("src/lib/providers/sms/index.ts");
    expect(sms).toContain("toRedacted: redactPhone(input.to)");
    expect(sms).not.toMatch(/toRedacted:\s*input\.to\b/);
  });

  it("keeps the full number out of the audit trail", () => {
    const manual = read("src/app/api/door/manual/route.ts");
    expect(manual).toContain("last4: phone.slice(-4)");
    expect(manual).not.toMatch(/after:\s*\{[^}]*\bphone\b\s*[,}]/);
  });
});

describe("URLs", () => {
  it("routes a Stem by an opaque token, never by a database id", () => {
    const routes = walk("src/app").filter((f) => f.endsWith("page.tsx"));
    const publicRoutes = routes.filter((f) => f.includes("(public)"));
    for (const route of publicRoutes) {
      expect(route).not.toMatch(/\[(memberId|stemGuestId|applicationId|userId)\]/);
    }
  });

  it("never puts a phone, an email or a name in a query string", () => {
    const offenders: string[] = [];
    for (const file of source) {
      const text = read(file);
      if (/[?&](phone|email|name|address)=\$\{/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("puts only opaque tokens in the two links we send people", () => {
    const messages = read("src/content/messages.ts");
    expect(messages).toContain("night.slug");
    expect(messages).not.toContain("memberNumber");
    expect(messages).not.toContain("phone");
  });
});

describe("errors", () => {
  it("answers every failure with one of a handful of fixed lines", () => {
    const lines = Object.values(copy.errors);
    expect(lines).toContain("NOTHING HERE.");
    for (const line of lines) {
      expect(line.length).toBeLessThan(40);
      // no stack, no field name, no id, no "something went wrong"
      expect(line).not.toMatch(/error|exception|invalid|failed|prisma/i);
    }
  });

  it("never returns a caught error's message to a caller", () => {
    const offenders: string[] = [];
    for (const file of walk("src/app").filter((f) => f.includes("/api/"))) {
      const text = read(file);
      if (/error:\s*(err|error|e)\.message/.test(text)) offenders.push(file);
      if (/JSON\.stringify\((err|error)\)/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("answers a wrong role with 404, so a route's existence is never confirmed", () => {
    for (const file of walk("src/app").filter((f) => f.includes("/api/door/"))) {
      const text = read(file);
      if (!text.includes("requireDoor")) continue;
      expect(text).toContain("status: 404");
      expect(text).not.toContain("status: 403");
    }
  });

  it("says the same thing to a duplicate application as to a new one", () => {
    const apply = read("src/app/api/apply/route.ts");
    // the duplicate branch returns ok(), exactly like the success path
    expect(apply).toMatch(/if \(existing\) \{\s*return ok\(\);/);
  });
});

describe("source maps and bundles", () => {
  it("keeps every secret behind process.env, never inlined for the client", () => {
    const clientFiles = source.filter((f) => read(f).startsWith('"use client"') || read(f).includes('\n"use client"'));
    for (const file of clientFiles) {
      const text = read(file);
      for (const secret of [
        "FIELD_ENCRYPTION_KEY",
        "CODE_HASH_PEPPER",
        "CRON_SECRET",
        "AUTH_SECRET",
        "DATABASE_URL",
        "ATELIER_ALLOWLIST",
      ]) {
        expect(text).not.toContain(secret);
      }
    }
  });

  it("exposes only NEXT_PUBLIC_ values to the browser", () => {
    const offenders: string[] = [];
    for (const file of source) {
      const text = read(file);
      if (!text.includes('"use client"')) continue;
      for (const match of text.matchAll(/process\.env\.([A-Z_]+)/g)) {
        if (!match[1]?.startsWith("NEXT_PUBLIC_")) offenders.push(`${file}: ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
