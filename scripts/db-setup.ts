import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import type { Database } from "../src/db";
import * as schema from "../src/db/schema";
import { seedIfEmpty } from "../src/db/seed";

/** Prepares the Neon database: applies the migrations and, if it is empty, loads the test data. */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL.");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const database = drizzle(pool, { schema });
  await migrate(database, { migrationsFolder: "./drizzle" });
  await seedIfEmpty(database as unknown as Database);
  await pool.end();
  console.log("Base de datos lista.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
