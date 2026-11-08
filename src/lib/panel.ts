import { and, asc, between, eq } from "drizzle-orm";
import { getDb, isTestDatabase } from "../db";
import { accounts, agendaItems, agents, approvals, pieceResults, pieces } from "../db/schema";
import { addDays, mondayOf, todayInCostaRica } from "./dates";
import { normalizeHandle } from "./handles";
import type { InstagramProfile } from "./instagram";
import { metaConfig } from "./instagram";
import { checkRequest, FORMATS, type Request } from "./portero";
import { canEncrypt } from "./secure";
import { isProtected } from "./session";

/** What the screen may know about an account: never its token. */
const accountColumns = {
  id: accounts.id, handle: accounts.handle, network: accounts.network, brand: accounts.brand, scene: accounts.scene, linked: accounts.linked,
  website: accounts.website, voice: accounts.voice, offer: accounts.offer, audience: accounts.audience, neverPromise: accounts.neverPromise,
  businessInfo: accounts.businessInfo, avatarUrl: accounts.avatarUrl, followers: accounts.followers, tokenExpiresAt: accounts.tokenExpiresAt,
};

const REVIEW = 2;
const SCHEDULED = 3;
const PUBLISHED = 4;

export type Snapshot = Awaited<ReturnType<typeof loadPanel>>;

export async function loadPanel() {
  const db = await getDb();
  const today = todayInCostaRica();
  const weekStart = mondayOf(today);
  const [accountRows, agentRows, pieceRows, agendaRows, pendingRows, resultRows] = await Promise.all([
    db.select(accountColumns).from(accounts).orderBy(asc(accounts.handle)),
    db.select().from(agents).orderBy(asc(agents.sortOrder)),
    db.select().from(pieces).orderBy(asc(pieces.id)),
    db.select().from(agendaItems).where(between(agendaItems.scheduledOn, weekStart, addDays(weekStart, 6))).orderBy(asc(agendaItems.time)),
    db.select().from(approvals).where(eq(approvals.status, "pending")).orderBy(asc(approvals.id)),
    db.select().from(pieceResults),
  ]);
  return {
    today,
    weekStart,
    isTest: isTestDatabase(),
    canConnect: Boolean(metaConfig()) && isProtected() && canEncrypt() && !isTestDatabase(),
    isProtected: isProtected(),
    accounts: accountRows,
    agents: agentRows,
    pieces: pieceRows,
    agenda: agendaRows,
    results: resultRows,
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

/** An account planned by hand: it can receive pieces and be connected later. Returns the reason when it can't. */
export async function addAccount(network: string, name: string, brand: string) {
  const handle = normalizeHandle(network, name);
  if (!handle) return network === "instagram" ? "Escribe el usuario de Instagram: letras, números, punto o guion bajo." : "Escribe el nombre de la página.";
  const db = await getDb();
  if ((await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.handle, handle))).length > 0) return `${handle} ya está agregada.`;
  const id = `${network === "instagram" ? "ig" : "fb"}-${handle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`.slice(0, 60);
  await db.insert(accounts).values({ id, handle, network, brand: brand.trim().slice(0, 80) || handle.replace(/^@/, "") });
  return null;
}

/** Disconnecting forgets the token. An account without pieces is removed; one with pieces stays, unconnected. */
export async function removeAccount(id: string) {
  const db = await getDb();
  const used = await db.select({ id: pieces.id }).from(pieces).where(eq(pieces.accountId, id)).limit(1);
  const usedInAgenda = await db.select({ id: agendaItems.id }).from(agendaItems).where(eq(agendaItems.accountId, id)).limit(1);
  if (used.length === 0 && usedInAgenda.length === 0) {
    await db.delete(accounts).where(eq(accounts.id, id));
    return;
  }
  await db.update(accounts).set({ linked: false, tokenCipher: null, tokenExpiresAt: null, connectedAt: null }).where(eq(accounts.id, id));
}

/** After the owner authorized it: the account with its real name, picture and followers, and its encrypted token. */
export async function saveInstagramConnection(profile: InstagramProfile, tokenCipher: string, expiresAt: Date, attachTo: string | null) {
  const db = await getDb();
  const values = {
    handle: `@${profile.username.toLowerCase()}`, network: "instagram", externalId: profile.userId, avatarUrl: profile.avatarUrl, followers: profile.followers,
    tokenCipher, tokenExpiresAt: expiresAt, connectedAt: new Date(), linked: true,
  };
  const [known] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.externalId, profile.userId));
  const [planned] = attachTo ? await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, attachTo)) : [];
  const [sameName] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.handle, values.handle));
  const target = known ?? planned ?? sameName;
  if (target) {
    await db.update(accounts).set(values).where(eq(accounts.id, target.id));
  } else {
    await db.insert(accounts).values({ id: `ig-${profile.userId}`, brand: profile.username, ...values });
  }
}

export type BrandProfile = { website: string; voice: string; offer: string; audience: string; neverPromise: string; businessInfo: string };

const LIMITS: Record<keyof BrandProfile, number> = { website: 200, voice: 400, offer: 400, audience: 400, neverPromise: 400, businessInfo: 1000 };

/** What the writers read before each piece. Returns the reason when it can't be saved. */
export async function saveBrandProfile(id: string, profile: BrandProfile) {
  const clean = Object.fromEntries((Object.keys(LIMITS) as (keyof BrandProfile)[]).map((key) => [key, String(profile[key] ?? "").trim().slice(0, LIMITS[key])])) as BrandProfile;
  if (clean.website && !/^https:\/\/[^\s]+\.[^\s]+$/.test(clean.website)) {
    return "El sitio web debe empezar con https://";
  }
  const db = await getDb();
  await db.update(accounts).set(clean).where(eq(accounts.id, id));
  return null;
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
  const verdict = checkRequest(request, await db.select(accountColumns).from(accounts));
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
