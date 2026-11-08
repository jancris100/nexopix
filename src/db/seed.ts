import { agents } from "./schema";
import type { Database } from "./index";

/** A new database starts with the team only: the networks and the pieces are added from the panel. */
export async function seedIfEmpty(database: Database) {
  if ((await database.select({ id: agents.id }).from(agents).limit(1)).length > 0) {
    return;
  }
  await database.insert(agents).values([
    { id: "estratega", name: "Estratega", job: "Propone ideas y arma la semana", sortOrder: 0 },
    { id: "guionista", name: "Guionista", job: "Escribe guiones y descripciones", sortOrder: 1 },
    { id: "enrutador", name: "Enrutador", job: "Decide a qué pipeline y cuenta va cada pieza", sortOrder: 2 },
    { id: "programador", name: "Programador", job: "Deja listo cada horario de publicación", sortOrder: 3 },
    { id: "analista", name: "Analista", job: "Lee resultados y sugiere qué repetir", sortOrder: 4 },
  ]);
}
