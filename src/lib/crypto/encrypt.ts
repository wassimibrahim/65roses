// AES-256-GCM field encryption for PII at rest (phone, addressLine).
// Deterministic: the IV is derived from the plaintext via HMAC (SIV-style), so the
// same value encrypts identically and unique/equality lookups keep working.
// Trade-off (accepted): equal plaintexts are visible as equal ciphertexts.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync } from "node:crypto";
import { Prisma } from "@prisma/client";

const PREFIX = "65v1:";

let cachedKeys: { encKey: Buffer; ivKey: Buffer } | null = null;

function keys(): { encKey: Buffer; ivKey: Buffer } {
  if (cachedKeys) return cachedKeys;
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  const master = Buffer.from(raw, "base64");
  if (master.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes, base64");
  cachedKeys = {
    encKey: Buffer.from(hkdfSync("sha256", master, "", "65roses:field-enc", 32)),
    ivKey: Buffer.from(hkdfSync("sha256", master, "", "65roses:field-iv", 32)),
  };
  return cachedKeys;
}

export function encryptField(plain: string): string {
  if (plain === "" || plain.startsWith(PREFIX)) return plain;
  const { encKey, ivKey } = keys();
  const iv = createHmac("sha256", ivKey).update(plain).digest().subarray(0, 12);
  const cipher = createCipheriv("aes-256-gcm", encKey, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptField(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const { encKey } = keys();
  const blob = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// fields marked "encrypted at rest" in schema.prisma — these key names are
// unique to PII-bearing models, so they are matched by name wherever they appear.
//
// notes is here because "the blue door behind the pharmacy, ring twice" is her
// address written another way, and it deserves the same protection as the line
// above it. It is a string only on DeliveryAddress; everywhere else in the
// schema a key called notes is a relation, and relations are walked, not encrypted.
const ENCRYPTED_KEYS = new Set(["phone", "addressLine", "notes"]);

// Prisma arguments whose leaves are directives rather than values: "asc",
// "desc", "last", a field name. Encrypting one of those sends ciphertext where
// Prisma expects a keyword. select and include are deliberately NOT here —
// their subtrees can hold a nested where that does need encrypting, and their
// own leaves are booleans, which nothing here touches.
const DIRECTIVE_KEYS = new Set([
  "orderBy",
  "distinct",
  "by",
  "_count",
  "_sum",
  "_avg",
  "_min",
  "_max",
]);

function transform(value: unknown, fn: (s: string) => string, insideEncryptedKey = false): unknown {
  if (typeof value === "string") return insideEncryptedKey ? fn(value) : value;
  if (Array.isArray(value)) return value.map((v) => transform(v, fn, insideEncryptedKey));
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        DIRECTIVE_KEYS.has(k) ? v : transform(v, fn, ENCRYPTED_KEYS.has(k)),
      ]),
    );
  }
  return value;
}

function decryptResult(value: unknown): unknown {
  if (typeof value === "string") return decryptField(value);
  if (Array.isArray(value)) return value.map(decryptResult);
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        ENCRYPTED_KEYS.has(k) && typeof v === "string" ? decryptField(v) : decryptResult(v),
      ]),
    );
  }
  return value;
}

// Prisma extension: encrypts phone/addressLine in every write and in where
// clauses (deterministic encryption makes equality still match), decrypts them
// in every result, however deeply nested via include/select.
// exported so the rules above can be asserted directly — the extension is the
// only place PII protection is applied, so it is the last place to guess
export const encryptArgs = <T>(args: T): T => transform(args, encryptField) as T;
export const decryptRow = <T>(row: T): T => decryptResult(row) as T;

export const fieldEncryptionExtension = Prisma.defineExtension({
  name: "field-encryption",
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const result = await query(encryptArgs(args));
        return decryptRow(result);
      },
    },
  },
});
