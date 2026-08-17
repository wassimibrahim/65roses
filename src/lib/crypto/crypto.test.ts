// crypto: field encryption roundtrip, determinism, tamper detection; code hashing
import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  process.env.CODE_HASH_PEPPER = randomBytes(32).toString("base64");
});

describe("field encryption", () => {
  it("roundtrips", async () => {
    const { encryptField, decryptField } = await import("./encrypt");
    const phone = "+9613123456";
    const stored = encryptField(phone);
    expect(stored).not.toContain("123456");
    expect(stored.startsWith("65v1:")).toBe(true);
    expect(decryptField(stored)).toBe(phone);
  });

  it("is deterministic so equality lookups still work", async () => {
    const { encryptField } = await import("./encrypt");
    expect(encryptField("+9613123456")).toBe(encryptField("+9613123456"));
    expect(encryptField("+9613123456")).not.toBe(encryptField("+9613123457"));
  });

  it("does not double-encrypt", async () => {
    const { encryptField, decryptField } = await import("./encrypt");
    const once = encryptField("+9613123456");
    expect(encryptField(once)).toBe(once);
    expect(decryptField(decryptField(once))).toBe("+9613123456");
  });

  it("rejects tampered ciphertext", async () => {
    const { encryptField, decryptField } = await import("./encrypt");
    const stored = encryptField("+9613123456");
    const blob = Buffer.from(stored.slice(5), "base64");
    blob[blob.length - 1] = blob[blob.length - 1]! ^ 0xff;
    expect(() => decryptField("65v1:" + blob.toString("base64"))).toThrow();
  });
});

describe("code hashing", () => {
  it("verifies the right code and rejects the wrong one", async () => {
    const { hashCode, verifyCode } = await import("./hash");
    const stored = hashCode("482173", "otp:PHONE_VERIFY:+9613123456");
    expect(verifyCode("482173", "otp:PHONE_VERIFY:+9613123456", stored)).toBe(true);
    expect(verifyCode("482174", "otp:PHONE_VERIFY:+9613123456", stored)).toBe(false);
    // same code, different context — different hash
    expect(verifyCode("482173", "otp:LOGIN:+9613123456", stored)).toBe(false);
  });

  it("argon2id hashes and verifies passwords", async () => {
    const { hashPassword, verifyPassword } = await import("./hash");
    const hash = await hashPassword("correct horse battery");
    expect(hash).toContain("$argon2id$");
    expect(await verifyPassword(hash, "correct horse battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });
});
