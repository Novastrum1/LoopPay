import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { looppayDb?: PrismaClient };
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  return globalDb.looppayDb ?? (globalDb.looppayDb = new PrismaClient());
}
export const unavailable = () =>
  Response.json({ error: "Indexer database unavailable" }, { status: 503 });
