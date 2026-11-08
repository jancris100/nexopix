type Piece = { id: number; title: string; stage: number; pipeline: string };
type Result = { pieceId: number; clicks: number; leads: number };

const PUBLISHED = 4;
const REVIEW = 2;

/** The piece's link marked with UTM, so each visit can be traced back to the publication that brought it. */
export function trackedLink(website: string, network: string, piece: { id: number; pipeline: string }) {
  if (!website) return null;
  const url = new URL(website);
  url.searchParams.set("utm_source", network);
  url.searchParams.set("utm_medium", piece.pipeline === "ads" ? "paid" : "social");
  url.searchParams.set("utm_campaign", `pieza-${piece.id}`);
  return url.toString();
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The morning summary, in plain sentences. Only counts what is in the data: it never estimates. */
export function morningSummary(pieces: readonly Piece[], results: readonly Result[], pendingToday: number) {
  const clicks = results.reduce((total, result) => total + result.clicks, 0);
  const leads = results.reduce((total, result) => total + result.leads, 0);
  const best = [...results].sort((a, b) => b.leads - a.leads || b.clicks - a.clicks)[0];
  const bestPiece = best && best.leads > 0 ? pieces.find((piece) => piece.id === best.pieceId) : undefined;
  const toApprove = pieces.filter((piece) => piece.stage === REVIEW).length;
  const published = pieces.filter((piece) => piece.stage === PUBLISHED).length;

  return [
    `${plural(published, "pieza publicada", "piezas publicadas")}, con ${plural(clicks, "clic", "clics")} y ${plural(leads, "consulta", "consultas")}.`,
    bestPiece ? `La que más consultas trajo: ${bestPiece.title}.` : "Todavía ninguna pieza trajo consultas.",
    toApprove === 0 ? "No tienes nada por aprobar." : `Tienes ${plural(toApprove, "pieza", "piezas")} por aprobar.`,
    pendingToday === 0 ? "Hoy no queda nada en la agenda." : `${pendingToday === 1 ? "Hoy queda" : "Hoy quedan"} ${plural(pendingToday, "tarea", "tareas")} en la agenda.`,
  ];
}
