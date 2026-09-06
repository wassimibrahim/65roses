// smoke test — proves the vitest wiring works; real suites arrive with the infrastructure pass
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(65).toBe(65);
  });
});
