import { agents } from "./schema";
import type { Database } from "./index";

/** A new database starts with the team only. The names on screen come from the dictionaries, by id. */
export async function seedIfEmpty(database: Database) {
  if ((await database.select({ id: agents.id }).from(agents).limit(1)).length > 0) {
    return;
  }
  await database.insert(agents).values([
    { id: "strategist", name: "Strategist", job: "Proposes ideas and plans the week", sortOrder: 0 },
    { id: "writer", name: "Writer", job: "Writes scripts and captions", sortOrder: 1 },
    { id: "router", name: "Router", job: "Decides which pipeline and account each piece goes to", sortOrder: 2 },
    { id: "scheduler", name: "Scheduler", job: "Sets every publishing time", sortOrder: 3 },
    { id: "analyst", name: "Analyst", job: "Reads results and suggests what to repeat", sortOrder: 4 },
  ]);
}
