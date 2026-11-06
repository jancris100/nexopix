import { and, asc, between, eq } from "drizzle-orm";
import { getDb, isTestDatabase } from "../db";
import { accounts, agendaItems, agents, approvals, pieces } from "../db/schema";
import { addDays, mondayOf, todayInCostaRica } from "./dates";
import { checkRequest, FORMATS, type Request } from "./portero";

const REVIEW = 2;
const SCHEDULED = 3;
const PUBLISHED = 4;

export type Snapshot = Awaited<ReturnType<typeof loadPanel>>;

export async function loadPanel() {
  const db = await getDb();
  const today = todayInCostaRica();
  const weekStart = mondayOf(today);
  const [accountRows, agentRows, pieceRows, agendaRows, pendingRows] = await Promise.all([
    db.select().from(accounts).orderBy(asc(accounts.handle)),
    db.select().from(agents).orderBy(asc(agents.sortOrder)),
    db.select().from(pieces).orderBy(asc(pieces.id)),
    db.select().from(agendaItems).where(between(agendaItems.scheduledOn, weekStart, addDays(weekStart, 6))).orderBy(asc(agendaItems.time)),
    db.select().from(approvals).where(eq(approvals.status, "pending")).orderBy(asc(approvals.id)),
  ]);
  return {
    today,
    weekStart,
    isTest: isTestDatabase(),
    accounts: accountRows,
    agents: agentRows,
    pieces: pieceRows,
    agenda: agendaRows,
    approvals: pendingRows.map(({ id, pieceId, agent }) => ({ id, pieceId, agent })),
  };
}

export async function toggleAgendaItem(id: number) {
  const db = await getDb();
  const [item] = await db.select({ done: agendaItems.done }).from(agendaItems).where(eq(agendaItems.id, id));
  if (item) await db.update(agendaItems).set({ done: !item.done }).where(eq(agendaItems.id, id));
}

export async function toggleAgent(id: string) {
  const db = await getDb();
  const [agent] = await db.select({ active: agents.active }).from(agents).where(eq(agents.id, id));
  if (agent) await db.update(agents).set({ active: !agent.active }).where(eq(agents.id, id));
}

export async function toggleAccount(id: string) {
  const db = await getDb();
  const [account] = await db.select({ linked: accounts.linked }).from(accounts).where(eq(accounts.id, id));
  if (account) await db.update(accounts).set({ linked: !account.linked }).where(eq(accounts.id, id));
}

/** Moves a piece one stage. Entering review asks a person; leaving review only happens by deciding. */
export async function advancePiece(id: number) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [piece] = await tx.select().from(pieces).where(eq(pieces.id, id));
    if (!piece || piece.stage === REVIEW || piece.stage >= PUBLISHED) return;
    const stage = piece.stage + 1;
    await tx.update(pieces).set({ stage }).where(eq(pieces.id, id));
    if (stage === REVIEW) {
      await tx.insert(approvals).values({ pieceId: id, agent: piece.pipeline === "ads" ? "Estratega" : "Programador" });
    }
  });
}

/** Approving schedules the piece for the next day; rejecting sends it back to production. */
export async function decideApproval(id: number, approved: boolean) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [approval] = await tx.select().from(approvals).where(and(eq(approvals.id, id), eq(approvals.status, "pending")));
    if (!approval) return;
    await tx.update(approvals).set({ status: approved ? "approved" : "rejected", decidedAt: new Date() }).where(eq(approvals.id, id));
    await tx.update(pieces).set({ stage: approved ? SCHEDULED : 1 }).where(eq(pieces.id, approval.pieceId));
    if (approved) {
      const [piece] = await tx.select().from(pieces).where(eq(pieces.id, approval.pieceId));
      await tx.insert(agendaItems).values({
        scheduledOn: addDays(todayInCostaRica(), 1),
        time: "10:00",
        title: piece.title,
        format: piece.format,
        accountId: piece.accountId,
      });
    }
  });
}

/** Entry of the pipeline: the gate first; what passes becomes an idea and, with a date, an item of the week. */
export async function createRequest(request: Partial<Request>, scheduledOn?: string) {
  const db = await getDb();
  const verdict = checkRequest(request, await db.select().from(accounts));
  if (!verdict.ok) return verdict;
  const { account, format, title, manual } = verdict;
  const [piece] = await db
    .insert(pieces)
    .values({ pipeline: FORMATS[format].pipeline, title, format, accountId: account.id, scene: account.scene })
    .returning({ id: pieces.id });
  if (scheduledOn) {
    await db.insert(agendaItems).values({ scheduledOn, time: "12:00", title, format, accountId: account.id });
  }
  return { ok: true as const, pieceId: piece.id, manual };
}
