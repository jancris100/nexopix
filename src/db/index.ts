import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

export type Database = PgliteDatabase<typeof schema>;

const shared = globalThis as unknown as { nexopixDb?: Promise<Database> };

/** With DATABASE_URL (Neon) the data is real and shared. Without it, an embedded Postgres with test data. */
export const isTestDatabase = () => !process.env.DATABASE_URL;

async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon(new Pool({ connectionString: url }), { schema }) as unknown as Database;
  }
  // Locally the data survives restarts; on Vercel the disk is temporary, so it lives in memory.
  const folder = process.env.VERCEL ? undefined : path.join(process.cwd(), ".data", "pglite");
  if (folder) mkdirSync(folder, { recursive: true });
  const client = new PGlite(folder);
  const database = drizzlePglite(client, { schema });
  await migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seedIfEmpty(database);
  return database;
}

export function getDb(): Promise<Database> {
  shared.nexopixDb ??= connect().catch((error) => {
    shared.nexopixDb = undefined;
    throw error;
  });
  return shared.nexopixDb;
}
