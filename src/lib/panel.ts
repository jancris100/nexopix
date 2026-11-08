import { and, asc, between, desc, eq, lte, min } from "drizzle-orm";
import { getDb, isTestDatabase } from "../db";
import { accounts, agendaItems, agents, approvals, pieceResults, pieces } from "../db/schema";
import { addDays, isDate, mondayOf, todayInCostaRica } from "./dates";
import { normalizeHandle } from "./handles";
import type { InstagramProfile } from "./instagram";
import { mediaInsights, metaConfig, recentMedia } from "./instagram";
import { checkRequest, FORMATS, formatsFor, stateOf, type Request } from "./portero";
import { canEncrypt, decrypt } from "./secure";
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
  const [accountRows, agentRows, pieceRows, agendaRows, pendingRows, resultRows, [first], historyRows] = await Promise.all([
    db.select(accountColumns).from(accounts).orderBy(asc(accounts.handle)),
    db.select().from(agents).orderBy(asc(agents.sortOrder)),
    db.select().from(pieces).orderBy(asc(pieces.id)),
    db.select().from(agendaItems).where(between(agendaItems.scheduledOn, weekStart, addDays(weekStart, 6))).orderBy(asc(agendaItems.time)),
    db.select().from(approvals).where(eq(approvals.status, "pending")).orderBy(asc(approvals.id)),
    db.select().from(pieceResults),
    db.select({ day: min(agendaItems.scheduledOn) }).from(agendaItems),
    db.select().from(agendaItems).where(lte(agendaItems.scheduledOn, today)).orderBy(desc(agendaItems.scheduledOn), desc(agendaItems.time)).limit(300),
  ]);
  const firstDay = first?.day ? String(first.day) : today;
  return {
    today,
    weekStart,
    /** Monday of the first week with publications (week 1), never after this week. */
    firstWeek: mondayOf(firstDay < today ? firstDay : today),
    isTest: isTestDatabase(),
    canConnect: Boolean(metaConfig()) && isProtected() && canEncrypt() && !isTestDatabase(),
    isProtected: isProtected(),
    accounts: accountRows,
    agents: agentRows,
    pieces: pieceRows,
    agenda: agendaRows,
    /** What was planned up to today, newest first: the record of what was published and what was not. */
    history: historyRows,
    results: resultRows,
    approvals: pendingRows.map(({ id, pieceId, agent }) => ({ id, pieceId, agent })),
  };
}

/** The publications planned for the week that starts on that Monday. */
export async function loadWeek(weekStart: string) {
  if (!isDate(weekStart)) return [];
  const monday = mondayOf(weekStart);
  const db = await getDb();
  return db.select().from(agendaItems).where(between(agendaItems.scheduledOn, monday, addDays(monday, 6))).orderBy(asc(agendaItems.time));
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

/**
 * The Portero receives a request and keeps it: checked with fixed rules, stored with what it carried, and never twice
 * for the same reference of the same sender.
 */
export async function createRequest(request: Partial<Request>, scheduledOn?: string) {
  const db = await getDb();
  const verdict = checkRequest(request, await db.select(accountColumns).from(accounts));
  if (!verdict.ok) return verdict;
  const { account, format, title, manual, brief } = verdict;
  const origin = brief.origen ?? (brief.referencia ? "api" : null);

  if (brief.referencia) {
    const [known] = await db
      .select({ id: pieces.id, stage: pieces.stage })
      .from(pieces)
      .where(and(eq(pieces.origin, origin!), eq(pieces.externalRef, brief.referencia)));
    if (known) return { ok: true as const, pieceId: known.id, manual, duplicate: true, state: stateOf(known.stage) };
  }

  const day = brief.fecha ?? scheduledOn;
  const pieceId = await db.transaction(async (tx) => {
    const [piece] = await tx
      .insert(pieces)
      .values({ pipeline: FORMATS[format].pipeline, title, format, accountId: account.id, scene: account.scene, origin, externalRef: brief.referencia, brief: { ...brief, origen: origin } })
      .returning({ id: pieces.id });
    if (day) await tx.insert(agendaItems).values({ scheduledOn: day, time: "12:00", title, format, accountId: account.id });
    return piece.id;
  });
  return { ok: true as const, pieceId, manual, duplicate: false, state: stateOf(0) };
}

/** What another system may read of a piece: where it is and, once published, where to see it. */
export async function requestStatus(lookup: { id?: number; origin?: string; reference?: string }) {
  const db = await getDb();
  const where =
    lookup.id !== undefined
      ? eq(pieces.id, lookup.id)
      : lookup.reference
        ? and(eq(pieces.origin, lookup.origin || "api"), eq(pieces.externalRef, lookup.reference))
        : undefined;
  if (!where) return null;
  const [piece] = await db
    .select({ id: pieces.id, stage: pieces.stage, title: pieces.title, format: pieces.format, accountId: pieces.accountId, origin: pieces.origin, externalRef: pieces.externalRef, permalink: pieces.permalink, createdAt: pieces.createdAt })
    .from(pieces)
    .where(where);
  if (!piece) return null;
  const [owner] = await db.select({ handle: accounts.handle, network: accounts.network }).from(accounts).where(eq(accounts.id, piece.accountId));
  return {
    id: piece.id,
    estado: stateOf(piece.stage),
    objetivo: piece.title,
    formato: piece.format,
    cuenta: owner?.handle ?? null,
    red: owner?.network ?? null,
    origen: piece.origin,
    referencia: piece.externalRef,
    enlace: piece.permalink,
    recibida: piece.createdAt.toISOString(),
  };
}

/** The accounts a sender may choose from, with the formats each network takes. Never tokens. */
export async function publicAccounts() {
  const db = await getDb();
  const rows = await db.select({ id: accounts.id, handle: accounts.handle, network: accounts.network, brand: accounts.brand, linked: accounts.linked }).from(accounts).orderBy(asc(accounts.handle));
  return rows.map((row) => ({ id: row.id, cuenta: row.handle, red: row.network, marca: row.brand, conectada: row.linked, formatos: formatsFor(row.network) }));
}

/** The connected Instagram accounts with their opened token: server only, never sent to the screen. */
async function connectedInstagram(accountId?: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: accounts.id, handle: accounts.handle, externalId: accounts.externalId, tokenCipher: accounts.tokenCipher, tokenExpiresAt: accounts.tokenExpiresAt })
    .from(accounts)
    .where(accountId ? and(eq(accounts.network, "instagram"), eq(accounts.id, accountId)) : eq(accounts.network, "instagram"));
  return rows.flatMap((row) => {
    if (!row.externalId || !row.tokenCipher) return [];
    try {
      return [{ id: row.id, handle: row.handle, userId: row.externalId, token: decrypt(row.tokenCipher), expired: Boolean(row.tokenExpiresAt && row.tokenExpiresAt < new Date()) }];
    } catch {
      return [];
    }
  });
}

/** What every connected account has published on Instagram, newest first, and which accounts could not be read. */
export async function instagramPosts() {
  const linked = await connectedInstagram();
  const settled = await Promise.all(
    linked.map(async (account) => {
      if (account.expired) return { posts: [], problem: `${account.handle}: el permiso venció, vuelve a conectarla en Redes.` };
      try {
        return { posts: await recentMedia(account.userId, account.token, account.id), problem: null };
      } catch (error) {
        console.error("Instagram media failed", account.id, error instanceof Error ? error.message : error);
        return { posts: [], problem: `${account.handle}: Instagram no entregó las publicaciones.` };
      }
    }),
  );
  return {
    posts: settled.flatMap((result) => result.posts).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    problems: settled.flatMap((result) => (result.problem ? [result.problem] : [])),
  };
}

export async function instagramPostInsights(accountId: string, mediaId: string) {
  if (!/^\d+$/.test(mediaId)) return { insights: null, reason: "no-disponible" };
  const [account] = await connectedInstagram(accountId);
  if (!account) return { insights: null, reason: "sin-cuenta" };
  return mediaInsights(mediaId, account.token);
}
