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

describe("the extension's argument rules", () => {
  it("encrypts values written to and searched by an encrypted field", async () => {
    const { encryptArgs, encryptField } = await import("./encrypt");
    const args = encryptArgs({
      where: { phone: "+9613123456" },
      data: { addressLine: "Rue Gouraud 12", notes: "blue door, ring twice" },
    });
    expect(args.where.phone).toBe(encryptField("+9613123456"));
    expect(args.data.addressLine).toBe(encryptField("Rue Gouraud 12"));
    expect(args.data.notes).toBe(encryptField("blue door, ring twice"));
  });

  it("leaves a sort direction alone — 'asc' is a keyword, not a value", async () => {
    const { encryptArgs } = await import("./encrypt");
    const args = encryptArgs({
      orderBy: [{ phone: "asc" }, { notes: { sort: "desc", nulls: "last" } }],
      distinct: ["phone"],
    });
    expect(args.orderBy[0]!.phone).toBe("asc");
    expect(args.orderBy[1]!.notes).toEqual({ sort: "desc", nulls: "last" });
    expect(args.distinct).toEqual(["phone"]);
  });

  it("still encrypts a where nested inside an include", async () => {
    const { encryptArgs, encryptField } = await import("./encrypt");
    const args = encryptArgs({
      include: { member: { where: { phone: "+9613123456" }, select: { phone: true } } },
    });
    expect(args.include.member.where.phone).toBe(encryptField("+9613123456"));
    expect(args.include.member.select.phone).toBe(true);
  });

  it("walks a relation named notes without mangling it", async () => {
    const { encryptArgs } = await import("./encrypt");
    const args = encryptArgs({ data: { notes: { create: { body: "she is a friend" } } } });
    expect(args.data.notes.create.body).toBe("she is a friend");
  });

  it("decrypts an encrypted field however deeply a result nests it", async () => {
    const { decryptRow, encryptField } = await import("./encrypt");
    const row = decryptRow({
      id: "1",
      member: { phone: encryptField("+9613123456") },
      deliveries: [{ address: { addressLine: encryptField("Rue Gouraud 12") } }],
    });
    expect(row.member.phone).toBe("+9613123456");
    expect(row.deliveries[0]!.address.addressLine).toBe("Rue Gouraud 12");
  });
});
