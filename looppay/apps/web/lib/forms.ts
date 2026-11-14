import { z } from "zod";
export const merchantSchema = z.object({
  name: z.string().min(2).max(80),
  logo: z.union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((s) => s.startsWith("https://"), "Use HTTPS"),
  ]),
  category: z.string().min(2).max(60),
  country: z.string().min(2).max(80),
  location: z.string().max(120),
  payout: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  terms: z.string().min(10).max(1000),
});
export const invoiceSchema = z.object({
  amount: z.string().min(1),
  label: z.string().min(1).max(80),
  reference: z.string().min(1).max(120),
  expires: z
    .string()
    .refine(
      (v) => Number.isFinite(Date.parse(v)) && Date.parse(v) > Date.now(),
      "Expiry must be in the future",
    ),
  campaign: z.string().regex(/^\d+$/),
});
export const campaignSchema = z
  .object({
    bps: z.coerce.number().int().min(1).max(10000),
    minimum: z.string().min(1),
    cap: z.string().min(1),
    budget: z.string().min(1),
    start: z.string().min(1),
    end: z.string().min(1),
  })
  .refine(
    (v) => Date.parse(v.end) > Math.max(Date.parse(v.start), Date.now()),
    "End must follow start and be in the future",
  );
export function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}
export function parseMetadata(value: string): {
  name?: string;
  terms?: string;
  category?: string;
  country?: string;
  location?: string;
  logo?: string;
} {
  try {
    const data = merchantSchema.parse(JSON.parse(value));
    return data;
  } catch {
    return {};
  }
}
