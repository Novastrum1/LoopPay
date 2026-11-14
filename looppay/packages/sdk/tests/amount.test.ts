import { describe, it, expect } from "vitest";
import { tokenAmount, hashOrder } from "../src";
import { explorerLink, networkSchema } from "@looppay/config";
describe("safe token units", () => {
  it("preserves amounts beyond Number precision", () =>
    expect(tokenAmount("9007199254740993.123456", 6)).toBe(
      9007199254740993123456n,
    ));
  it.each(["1e3", "-1", "0", "1.0000001", "NaN", " 1", "01"])(
    "rejects %s",
    (value) => expect(() => tokenAmount(value, 6)).toThrow(),
  );
  it("hashes private order references", () =>
    expect(hashOrder("order")).toMatch(/^0x[0-9a-f]{64}$/));
  it("requires configured addresses", () =>
    expect(networkSchema.safeParse({ chainId: 1983 }).success).toBe(false));
  it("does not invent an explorer", () =>
    expect(explorerLink(undefined, "0x" + "a".repeat(64))).toBeUndefined());
});
