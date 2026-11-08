import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import type { Database } from "../src/db";
import * as schema from "../src/db/schema";
import { seedIfEmpty } from "../src/db/seed";

/** Runs on every build: with DATABASE_URL it applies the migrations and adds the team if it is missing. */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("Sin DATABASE_URL: el panel usará la base temporal.");
    return;
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
