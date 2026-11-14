import { it, expect } from "vitest";
import { merchantSchema, invoiceSchema } from "./forms";
it("rejects unsafe logo URLs and missing business data", () =>
  expect(
    merchantSchema.safeParse({ name: "A", logo: "javascript:alert(1)" })
      .success,
  ).toBe(false));
it("rejects expired invoices", () =>
  expect(
    invoiceSchema.safeParse({
      amount: "1",
      label: "USD",
      reference: "one",
      expires: "2020-01-01",
      campaign: "0",
    }).success,
  ).toBe(false));
