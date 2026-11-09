import { and, asc, between, desc, eq, isNotNull, lte, min } from "drizzle-orm";
import { getDb, isTestDatabase } from "../db";
import { accounts, agendaItems, agents, approvals, ownerProfile, pieceEvents, pieceResults, pieces } from "../db/schema";
import { cleanContent, fullCaption, latestVersion, nextVersion, versionsOf, writeVersion, type ContentIssue, type ContentValues } from "./content";
import { absoluteMedia, cleanColor, cleanCreative, creativePath, isCreativePath, isTemplate, TEMPLATES, type Creative, type TemplateId } from "./templates";
import type { RenderInput } from "./render";
import { recordEvent, STAGE_ACTORS } from "./events";
import { addDays, costaRicaTime, isDate, mondayOf, todayInCostaRica } from "./dates";
import { normalizeHandle } from "./handles";
import type { InstagramProfile } from "./instagram";
import { mediaInsights, metaConfig, publishMedia, PublishError, recentMedia } from "./instagram";
import { checkRequest, FORMATS, formatsFor, statusOf, type Request } from "./gatekeeper";
import { canEncrypt, decrypt } from "./secure";
import { isProtected } from "./session";

/** What the screen may know about an account: never its token. */
const accountColumns = {
  id: accounts.id, handle: accounts.handle, network: accounts.network, brand: accounts.brand, scene: accounts.scene, linked: accounts.linked,
  website: accounts.website, voice: accounts.voice, offer: accounts.offer, audience: accounts.audience, neverPromise: accounts.neverPromise,
  businessInfo: accounts.businessInfo, avatarUrl: accounts.avatarUrl, followers: accounts.followers, tokenExpiresAt: accounts.tokenExpiresAt,
  logoUrl: accounts.logoUrl, brandColor: accounts.brandColor, accentColor: accounts.accentColor, defaultTemplate: accounts.defaultTemplate,
};

const REVIEW = 2;
const SCHEDULED = 3;
const PUBLISHED = 4;

export type Snapshot = Awaited<ReturnType<typeof loadPanel>>;

export async function loadPanel() {
  const db = await getDb();
  const today = todayInCostaRica();
  const weekStart = mondayOf(today);
  const [accountRows, agentRows, pieceRows, agendaRows, pendingRows, resultRows, [first], historyRows, [owner]] = await Promise.all([
    db.select(accountColumns).from(accounts).orderBy(asc(accounts.handle)),
    db.select().from(agents).orderBy(asc(agents.sortOrder)),
    db.select().from(pieces).orderBy(asc(pieces.id)),
    db.select().from(agendaItems).where(between(agendaItems.scheduledOn, weekStart, addDays(weekStart, 6))).orderBy(asc(agendaItems.time)),
    db.select().from(approvals).where(eq(approvals.status, "pending")).orderBy(asc(approvals.id)),
    db.select().from(pieceResults),
    db.select({ day: min(agendaItems.scheduledOn) }).from(agendaItems),
    db.select().from(agendaItems).where(lte(agendaItems.scheduledOn, today)).orderBy(desc(agendaItems.scheduledOn), desc(agendaItems.time)).limit(300),
    db.select({ name: ownerProfile.name, email: ownerProfile.email, company: ownerProfile.company }).from(ownerProfile).where(eq(ownerProfile.id, 1)),
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
    /** Who owns this Nexopix, shown in the profile menu. */
    owner: owner ?? { name: "", email: "", company: "" },
    /** What the server has configured, as yes or no only: values never leave the server. */
    setup: {
      apiKey: Boolean(process.env.NEXOPIX_API_KEY),
      meta: Boolean(metaConfig()),
      encryption: canEncrypt(),
      database: !isTestDatabase(),
    },
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
  if (!handle) return { code: network === "instagram" ? ("instagram_handle" as const) : ("page_name" as const) };
  const db = await getDb();
  if ((await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.handle, handle))).length > 0) return { code: "duplicate" as const, handle };
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
    return "website_invalid" as const;
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
    const actor = STAGE_ACTORS[piece.stage];
    if (stage === REVIEW) {
      await tx.insert(approvals).values({ pieceId: id, agent: piece.pipeline === "ads" ? "strategist" : "scheduler" });
      await recordEvent(tx, id, "approval_requested", actor, { from: piece.stage, to: stage });
    } else if (stage === PUBLISHED) {
      await recordEvent(tx, id, "published", actor, { from: piece.stage, to: stage });
    } else {
      await recordEvent(tx, id, "advanced", actor, { from: piece.stage, to: stage });
    }
  });
}

/** Approving schedules the piece for the next day; rejecting sends it back to production. */
/** A day and hour of Costa Rica (UTC-6, no daylight saving) as a moment. */
const costaRicaMoment = (day: string, time: string) => new Date(`${day}T${time}:00-06:00`);

/** When an approved piece goes out: the moment chosen, or the day asked at 10:00, or tomorrow at 10:00; never in the past. */
function publishMoment(chosen: { day?: string; time?: string } | undefined, asked: string | null | undefined) {
  const time = chosen?.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(chosen.time) ? chosen.time : "10:00";
  const today = todayInCostaRica();
  const day = chosen?.day && isDate(chosen.day) && chosen.day >= today ? chosen.day : asked && asked >= today ? asked : addDays(today, 1);
  const moment = costaRicaMoment(day, time);
  if (moment.getTime() >= Date.now()) return { day, time, at: moment };
  // A moment already gone means "as soon as possible": the next minute, written as it really is.
  const soon = new Date(Date.now() + 60_000);
  return { day: todayInCostaRica(soon), time: costaRicaTime(soon), at: soon };
}

export type Decision = { reason?: string; day?: string; time?: string };

export async function decideApproval(id: number, approved: boolean, decision: Decision = {}) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [approval] = await tx.select().from(approvals).where(and(eq(approvals.id, id), eq(approvals.status, "pending")));
    if (!approval) return;
    const reason = decision.reason?.trim().slice(0, 500) || null;
    await tx.update(approvals).set({ status: approved ? "approved" : "rejected", decidedAt: new Date() }).where(eq(approvals.id, id));
    await tx.update(pieces).set({ stage: approved ? SCHEDULED : 1 }).where(eq(pieces.id, approval.pieceId));
    await recordEvent(tx, approval.pieceId, approved ? "approved" : "rejected", "human", { from: REVIEW, to: approved ? SCHEDULED : 1, reason });
    if (!approved) return;
    const [piece] = await tx.select().from(pieces).where(eq(pieces.id, approval.pieceId));
    const when = publishMoment(decision, piece.brief?.publishOn);
    await tx.update(pieces).set({ scheduledAt: when.at }).where(eq(pieces.id, piece.id));
    const [slot] = await tx.select({ id: agendaItems.id }).from(agendaItems).where(eq(agendaItems.pieceId, piece.id)).limit(1);
    if (slot) {
      await tx.update(agendaItems).set({ scheduledOn: when.day, time: when.time }).where(eq(agendaItems.id, slot.id));
    } else {
      await tx.insert(agendaItems).values({ scheduledOn: when.day, time: when.time, title: piece.title, format: piece.format, accountId: piece.accountId, pieceId: piece.id });
    }
    await recordEvent(tx, piece.id, "scheduled", "scheduler", { on: when.day, time: when.time });
  });
}

/**
 * The Portero receives a request and keeps it: checked with fixed rules, stored with what it carried, and never twice
 * for the same reference of the same sender.
 */
export async function createRequest(request: Partial<Request>, scheduledOn?: string, traceId?: string | null) {
  const db = await getDb();
  const verdict = checkRequest(request, await db.select(accountColumns).from(accounts));
  if (!verdict.ok) return verdict;
  const { account, format, title, manual, brief } = verdict;
  const source = brief.source ?? (brief.reference ? "api" : null);

  if (brief.reference) {
    const [known] = await db
      .select({ id: pieces.id, stage: pieces.stage })
      .from(pieces)
      .where(and(eq(pieces.origin, source!), eq(pieces.externalRef, brief.reference)));
    if (known) {
      await recordEvent(db, known.id, "repeated", "gatekeeper", { source, reference: brief.reference }, traceId);
      return { ok: true as const, pieceId: known.id, manual, duplicate: true, status: statusOf(known.stage) };
    }
  }

  const day = brief.publishOn ?? scheduledOn;
  const pieceId = await db.transaction(async (tx) => {
    const [piece] = await tx
      .insert(pieces)
      .values({ pipeline: FORMATS[format].pipeline, title, format, accountId: account.id, scene: account.scene, origin: source, externalRef: brief.reference, brief: { ...brief, source } })
      .returning({ id: pieces.id });
    if (day) await tx.insert(agendaItems).values({ scheduledOn: day, time: "12:00", title, format, accountId: account.id, pieceId: piece.id });
    const fallback = account.defaultTemplate && isTemplate(account.defaultTemplate) && (TEMPLATES[account.defaultTemplate].formats as readonly string[]).includes(format) && brief.media.length > 0 ? account.defaultTemplate : null;
    const template = brief.template ?? fallback;
    const media = template ? [creativePath(piece.id, 1), ...brief.media] : brief.media;
    await writeVersion(tx, piece.id, { idea: [title, brief.notes].filter(Boolean).join("\n"), caption: "", hashtags: "", media }, "router", null, { template, creative: brief.creative, version: 1 });
    await recordEvent(tx, piece.id, "received", "gatekeeper", { source, reference: brief.reference, media: brief.media.length, product: brief.product?.name ?? null }, traceId);
    await recordEvent(tx, piece.id, "routed", "router", { pipeline: FORMATS[format].pipeline, account: account.handle, format, manual, publishOn: day ?? null }, traceId);
    return piece.id;
  });
  return { ok: true as const, pieceId, manual, duplicate: false, status: statusOf(0) };
}

/** What another system may read of a piece: where it is and, once published, where to see it. */
export async function requestStatus(lookup: { id?: number; source?: string; reference?: string }) {
  const db = await getDb();
  const where =
    lookup.id !== undefined
      ? eq(pieces.id, lookup.id)
      : lookup.reference
        ? and(eq(pieces.origin, lookup.source || "api"), eq(pieces.externalRef, lookup.reference))
        : undefined;
  if (!where) return null;
  const [piece] = await db
    .select({ id: pieces.id, stage: pieces.stage, title: pieces.title, format: pieces.format, accountId: pieces.accountId, origin: pieces.origin, externalRef: pieces.externalRef, permalink: pieces.permalink, createdAt: pieces.createdAt })
    .from(pieces)
    .where(where);
  if (!piece) return null;
  const [[owner], events] = await Promise.all([
    db.select({ handle: accounts.handle, network: accounts.network }).from(accounts).where(eq(accounts.id, piece.accountId)),
    pieceTrace(piece.id),
  ]);
  return {
    id: piece.id,
    status: statusOf(piece.stage),
    goal: piece.title,
    format: piece.format,
    account: owner?.handle ?? null,
    network: owner?.network ?? null,
    source: piece.origin,
    reference: piece.externalRef,
    permalink: piece.permalink,
    receivedAt: piece.createdAt.toISOString(),
    /** Everything that happened to the piece, oldest first. */
    events,
  };
}

/** The trace of a piece, oldest first, as the API and the panel show it. */
export async function pieceTrace(pieceId: number) {
  const db = await getDb();
  const rows = await db.select().from(pieceEvents).where(eq(pieceEvents.pieceId, pieceId)).orderBy(asc(pieceEvents.at), asc(pieceEvents.id));
  return rows.map((row) => ({ at: row.at.toISOString(), actor: row.actor, type: row.type, detail: row.detail ?? {}, traceId: row.traceId }));
}

/** The accounts a sender may choose from, with the formats each network takes. Never tokens. */
export async function publicAccounts() {
  const db = await getDb();
  const rows = await db.select({ id: accounts.id, handle: accounts.handle, network: accounts.network, brand: accounts.brand, linked: accounts.linked, defaultTemplate: accounts.defaultTemplate }).from(accounts).orderBy(asc(accounts.handle));
  return rows.map((row) => ({ id: row.id, handle: row.handle, network: row.network, brand: row.brand, connected: row.linked, formats: formatsFor(row.network), defaultTemplate: row.defaultTemplate }));
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
      if (account.expired) return { posts: [], problem: { handle: account.handle, kind: "expired" as const } };
      try {
        return { posts: await recentMedia(account.userId, account.token, account.id), problem: null };
      } catch (error) {
        console.error("Instagram media failed", account.id, error instanceof Error ? error.message : error);
        return { posts: [], problem: { handle: account.handle, kind: "failed" as const } };
      }
    }),
  );
  return {
    posts: settled.flatMap((result) => result.posts).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    problems: settled.flatMap((result) => (result.problem ? [result.problem] : [])),
  };
}

export async function instagramPostInsights(accountId: string, mediaId: string) {
  if (!/^\d+$/.test(mediaId)) return { insights: null, reason: "unavailable" };
  const [account] = await connectedInstagram(accountId);
  if (!account) return { insights: null, reason: "no-account" };
  return mediaInsights(mediaId, account.token);
}

export type OwnerProfile = { name: string; email: string; company: string };
const EMAIL = /^[^s@]+@[^s@]+.[^s@]+$/;

/** Saves the owner's profile. Returns the reason when a field does not fit. */
export async function saveOwnerProfile(values: OwnerProfile) {
  const clean = { name: String(values.name ?? "").trim().slice(0, 80), email: String(values.email ?? "").trim().toLowerCase().slice(0, 120), company: String(values.company ?? "").trim().slice(0, 80) };
  if (clean.email && !EMAIL.test(clean.email)) return "email_invalid" as const;
  const db = await getDb();
  await db
    .insert(ownerProfile)
    .values({ id: 1, ...clean, updatedAt: new Date() })
    .onConflictDoUpdate({ target: ownerProfile.id, set: { ...clean, updatedAt: new Date() } });
  return null;
}

/** Everything the piece sheet shows: the piece, its account, its versions (newest first) and its trace. */
export async function pieceDetail(pieceId: number) {
  const db = await getDb();
  const [piece] = await db.select().from(pieces).where(eq(pieces.id, pieceId));
  if (!piece) return null;
  const [[account], versions, events] = await Promise.all([
    db.select({ handle: accounts.handle, network: accounts.network, linked: accounts.linked }).from(accounts).where(eq(accounts.id, piece.accountId)),
    versionsOf(db, pieceId),
    pieceTrace(pieceId),
  ]);
  return {
    id: piece.id,
    title: piece.title,
    format: piece.format,
    stage: piece.stage,
    permalink: piece.permalink,
    scheduledAt: piece.scheduledAt?.toISOString() ?? null,
    publishOn: piece.brief?.publishOn ?? null,
    product: piece.brief?.product ?? null,
    account: account ?? null,
    templates: (Object.keys(TEMPLATES) as TemplateId[]).filter((id) => (TEMPLATES[id].formats as readonly string[]).includes(piece.format)),
    versions: versions.map((version) => ({ ...version, createdAt: version.createdAt.toISOString() })),
    events,
  };
}

/**
 * A new version of the content, written in the name of the agent of the stage (the person while in review). A
 * published piece is not edited.
 */
export async function savePieceContent(
  pieceId: number,
  values: Partial<ContentValues> & { template?: string | null; creative?: Creative },
  note?: string,
): Promise<ContentIssue | "published" | "missing" | "template_invalid" | null> {
  const db = await getDb();
  const cleaned = cleanContent(values);
  if ("issue" in cleaned) return cleaned.issue;
  const template = values.template ? (isTemplate(values.template) ? values.template : null) : null;
  if (values.template && !template) return "template_invalid";
  const creative = cleanCreative(values.creative);
  if (creative === null) return "template_invalid";
  return db.transaction(async (tx) => {
    const [piece] = await tx.select({ stage: pieces.stage, format: pieces.format }).from(pieces).where(eq(pieces.id, pieceId));
    if (!piece) return "missing";
    if (piece.stage >= PUBLISHED) return "published";
    if (template && !(TEMPLATES[template].formats as readonly string[]).includes(piece.format)) return "template_invalid";
    const author = STAGE_ACTORS[piece.stage];
    const number = await nextVersion(tx, pieceId);
    const originals = cleaned.content.media.filter((item) => !isCreativePath(item));
    const content = { ...cleaned.content, media: template ? [creativePath(pieceId, number), ...originals] : originals };
    const version = await writeVersion(tx, pieceId, content, author, note?.trim().slice(0, 300) || null, { template, creative, version: number });
    await recordEvent(tx, pieceId, "content_updated", author, { version });
    return null;
  });
}

/**
 * The scheduler publishes a piece on Instagram with its last version. Success leaves it published with its link and
 * ticks its slot of the week; a failure is written in the trace and the piece stays scheduled to try again.
 */
export async function publishPiece(pieceId: number, trigger: "manual" | "schedule"): Promise<{ ok: true; permalink: string | null } | { ok: false; code: string; message: string }> {
  const db = await getDb();
  const [piece] = await db.select().from(pieces).where(eq(pieces.id, pieceId));
  if (!piece) return { ok: false, code: "missing", message: "" };
  if (piece.stage !== SCHEDULED) return { ok: false, code: "not_scheduled", message: "" };
  const [account] = await connectedInstagram(piece.accountId);
  const fail = async (code: string, message: string) => {
    await recordEvent(db, pieceId, "publish_failed", "scheduler", { code, message: message.slice(0, 300), trigger });
    return { ok: false as const, code, message };
  };
  if (!account) return fail("account_not_connected", "La cuenta no está conectada a Instagram.");
  if (account.expired) return fail("token_expired", "El permiso de Instagram venció: vuelve a conectar la cuenta en Redes.");
  const content = await latestVersion(db, pieceId);
  try {
    const result = await publishMedia(account.userId, account.token, { format: piece.format, media: absoluteMedia(content?.media ?? []), caption: content ? fullCaption(content) : piece.title });
    await db.transaction(async (tx) => {
      await tx.update(pieces).set({ stage: PUBLISHED, permalink: result.permalink, externalMediaId: result.mediaId }).where(eq(pieces.id, pieceId));
      await tx.update(agendaItems).set({ done: true }).where(eq(agendaItems.pieceId, pieceId));
      await recordEvent(tx, pieceId, "published", "scheduler", { from: SCHEDULED, to: PUBLISHED, permalink: result.permalink, trigger });
    });
    return { ok: true, permalink: result.permalink };
  } catch (error) {
    if (error instanceof PublishError) return fail(error.code, error.message);
    console.error("Publishing failed", pieceId, error instanceof Error ? error.message : error);
    return fail("unexpected", "No se pudo publicar. Vuelve a intentar en unos minutos.");
  }
}

/** Pieces whose moment arrived, on connected Instagram accounts: the scheduler publishes them, a few per run. */
export async function publishDue(limit = 5) {
  const db = await getDb();
  const due = await db
    .select({ id: pieces.id })
    .from(pieces)
    .innerJoin(accounts, eq(accounts.id, pieces.accountId))
    .where(and(eq(pieces.stage, SCHEDULED), isNotNull(pieces.scheduledAt), lte(pieces.scheduledAt, new Date()), eq(accounts.network, "instagram"), eq(accounts.linked, true)))
    .orderBy(asc(pieces.scheduledAt))
    .limit(limit);
  const results = [];
  for (const piece of due) results.push({ id: piece.id, ...(await publishPiece(piece.id, "schedule")) });
  return results;
}

export type BrandKit = { logoUrl?: string | null; brandColor?: string | null; accentColor?: string | null; defaultTemplate?: string | null };

/** The brand kit the templates draw with. Returns what does not fit, or null when saved. */
export async function saveBrandKit(accountId: string, kit: BrandKit): Promise<"account_unknown" | "logo_not_https" | "color_invalid" | "template_unknown" | null> {
  const logo = kit.logoUrl ? String(kit.logoUrl).trim() : "";
  if (logo && !/^https:\/\/\S+$/.test(logo)) return "logo_not_https";
  const brandColor = kit.brandColor ? cleanColor(kit.brandColor) : null;
  const accentColor = kit.accentColor ? cleanColor(kit.accentColor) : null;
  if ((kit.brandColor && !brandColor) || (kit.accentColor && !accentColor)) return "color_invalid";
  const template = kit.defaultTemplate ? String(kit.defaultTemplate) : null;
  if (template && !isTemplate(template)) return "template_unknown";
  const db = await getDb();
  const updated = await db
    .update(accounts)
    .set({ logoUrl: logo || null, brandColor, accentColor, defaultTemplate: template })
    .where(eq(accounts.id, accountId))
    .returning({ id: accounts.id });
  return updated.length === 0 ? "account_unknown" : null;
}

/** What the renderer needs to draw version `version` of a piece; null when that version has no template. */
export async function creativeInput(pieceId: number, version: number): Promise<RenderInput | null> {
  const db = await getDb();
  const [row] = await db
    .select({ format: pieces.format, title: pieces.title, brief: pieces.brief, accountId: pieces.accountId })
    .from(pieces)
    .where(eq(pieces.id, pieceId));
  if (!row) return null;
  const versions = await versionsOf(db, pieceId);
  const current = versions.find((item) => item.version === version);
  if (!current?.template || !isTemplate(current.template)) return null;
  const [account] = await db
    .select({ brand: accounts.brand, logoUrl: accounts.logoUrl, brandColor: accounts.brandColor, accentColor: accounts.accentColor })
    .from(accounts)
    .where(eq(accounts.id, row.accountId));
  const product = row.brief?.product ?? null;
  const photo = current.media.find((item) => !isCreativePath(item) && !/\.(mp4|mov|m4v)(\?|#|$)/i.test(item)) ?? null;
  return {
    template: current.template,
    format: row.format,
    photo,
    name: product?.name ?? row.title,
    price: product?.price ?? null,
    currency: product?.currency ?? null,
    compareAtPrice: product?.compareAtPrice ?? null,
    description: product?.description ?? null,
    creative: current.creative ?? {},
    brand: { name: account?.brand ?? "", logoUrl: account?.logoUrl ?? null, color: account?.brandColor ?? null, accent: account?.accentColor ?? null },
  };
}
