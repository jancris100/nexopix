import { addDays, mondayOf, todayInCostaRica } from "../lib/dates";
import { accounts, agendaItems, agents, approvals, pieces } from "./schema";
import type { Database } from "./index";

/** Test data for an empty database: the two brands of the demo and a week of content. */
export async function seedIfEmpty(database: Database) {
  if ((await database.select({ id: accounts.id }).from(accounts).limit(1)).length > 0) {
    return;
  }
  const monday = mondayOf(todayInCostaRica());
  await database.insert(accounts).values([
    { id: "intenexo-ig", handle: "@intenexo.cr", network: "instagram", brand: "INTENEXO", scene: 2 },
    { id: "ticoexpress-ig", handle: "@ticoexpresscr", network: "instagram", brand: "Tico Express", scene: 3 },
    { id: "intenexo-fb", handle: "Página de INTENEXO", network: "facebook", brand: "Por crear", scene: 1 },
  ]);
  await database.insert(agents).values([
    { id: "estratega", name: "Estratega", job: "Propone ideas y arma la semana", sortOrder: 0 },
    { id: "guionista", name: "Guionista", job: "Escribe guiones y descripciones", sortOrder: 1 },
    { id: "enrutador", name: "Enrutador", job: "Decide a qué pipeline y cuenta va cada pieza", sortOrder: 2 },
    { id: "programador", name: "Programador", job: "Deja listo cada horario de publicación", sortOrder: 3 },
    { id: "analista", name: "Analista", job: "Lee resultados y sugiere qué repetir", active: false, sortOrder: 4 },
  ]);
  const day = (offset: number) => addDays(monday, offset);
  await database.insert(agendaItems).values([
    { scheduledOn: day(0), time: "09:00", title: "Reel: factura desde el celular", format: "reel", accountId: "intenexo-ig", done: true },
    { scheduledOn: day(1), time: "18:00", title: "Producto destacado de la semana", format: "publicacion", accountId: "ticoexpress-ig", done: true },
    { scheduledOn: day(2), time: "12:00", title: "Encuesta en historias", format: "historia", accountId: "ticoexpress-ig", done: true },
    { scheduledOn: day(3), time: "10:00", title: "Grabar reel animado", format: "reel", accountId: "intenexo-ig" },
    { scheduledOn: day(3), time: "17:30", title: "Revisar campaña", format: "anuncio", accountId: "ticoexpress-ig" },
    { scheduledOn: day(4), time: "11:00", title: "Carrusel: CRM para pymes", format: "publicacion", accountId: "intenexo-ig" },
    { scheduledOn: day(5), time: "19:00", title: "Unboxing de producto", format: "reel", accountId: "ticoexpress-ig" },
  ]);
  const created = await database
    .insert(pieces)
    .values([
      { pipeline: "reels", stage: 0, title: "Tres errores al facturar", format: "reel", accountId: "intenexo-ig", scene: 0 },
      { pipeline: "reels", stage: 2, title: "Reel animado de INTENEXO", format: "reel", accountId: "intenexo-ig", scene: 2 },
      { pipeline: "reels", stage: 1, title: "Unboxing de producto", format: "reel", accountId: "ticoexpress-ig", scene: 3 },
      { pipeline: "reels", stage: 1, title: "Factura desde el celular", format: "reel", accountId: "intenexo-ig", scene: 1 },
      { pipeline: "posts", stage: 1, title: "Carrusel: CRM para pymes", format: "publicacion", accountId: "intenexo-ig", scene: 1 },
      { pipeline: "posts", stage: 3, title: "Producto destacado", format: "publicacion", accountId: "ticoexpress-ig", scene: 3 },
      { pipeline: "ads", stage: 2, title: "Campaña de producto ganador", format: "anuncio", accountId: "ticoexpress-ig", scene: 0 },
    ])
    .returning({ id: pieces.id, stage: pieces.stage, pipeline: pieces.pipeline });
  await database.insert(approvals).values(
    created
      .filter((piece) => piece.stage === 2)
      .map((piece) => ({ pieceId: piece.id, agent: piece.pipeline === "ads" ? "Estratega" : "Programador" })),
  );
}
