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
  url.searchParams.set("utm_campaign", `piece-${piece.id}`);
  return url.toString();
}

/** The facts of the morning summary. Only counts what is in the data: it never estimates. The words are in the dictionaries. */
export function summaryFacts(pieces: readonly Piece[], results: readonly Result[], pendingToday: number) {
  const clicks = results.reduce((total, result) => total + result.clicks, 0);
  const leads = results.reduce((total, result) => total + result.leads, 0);
  const best = [...results].sort((a, b) => b.leads - a.leads || b.clicks - a.clicks)[0];
  const bestPiece = best && best.leads > 0 ? pieces.find((piece) => piece.id === best.pieceId) : undefined;
  return {
    published: pieces.filter((piece) => piece.stage === PUBLISHED).length,
    clicks,
    leads,
    best: bestPiece?.title ?? null,
    toApprove: pieces.filter((piece) => piece.stage === REVIEW).length,
    pendingToday,
  };
}
