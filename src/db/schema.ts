import { boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Brief } from "../lib/gatekeeper";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  network: text("network").notNull(),
  brand: text("brand").notNull(),
  scene: integer("scene").notNull().default(0),
  linked: boolean("linked").notNull().default(false),
  website: text("website").notNull().default(""),
  voice: text("voice").notNull().default(""),
  offer: text("offer").notNull().default(""),
  audience: text("audience").notNull().default(""),
  neverPromise: text("never_promise").notNull().default(""),
  businessInfo: text("business_info").notNull().default(""),
  /** The network's own id of the account, once connected. */
  externalId: text("external_id").unique(),
  avatarUrl: text("avatar_url"),
  followers: integer("followers"),
  /** Access token, encrypted with NEXOPIX_SECRET. Never leaves the server. */
  tokenCipher: text("token_cipher"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
});

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  job: text("job").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** A piece of content moving through a pipeline: 0 idea, 1 production, 2 review, 3 scheduled, 4 published. */
export const pieces = pgTable(
  "pieces",
  {
    id: serial("id").primaryKey(),
    pipeline: text("pipeline").notNull(),
    stage: integer("stage").notNull().default(0),
    title: text("title").notNull(),
    format: text("format").notNull(),
    accountId: text("account_id").notNull().references(() => accounts.id),
    scene: integer("scene").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Who asked for it from outside (for instance intenexo) and with which id of theirs. */
    origin: text("origin"),
    externalRef: text("external_ref"),
    /** What the request carried once checked: product, files, desired date and notes. */
    brief: jsonb("brief").$type<Brief>(),
    permalink: text("permalink"),
  },
  (table) => [index("pieces_pipeline_stage").on(table.pipeline, table.stage), uniqueIndex("pieces_origin_ref").on(table.origin, table.externalRef)],
);

export const agendaItems = pgTable(
  "agenda_items",
  {
    id: serial("id").primaryKey(),
    scheduledOn: date("scheduled_on").notNull(),
    time: text("time").notNull(),
    title: text("title").notNull(),
    format: text("format").notNull(),
    accountId: text("account_id").notNull().references(() => accounts.id),
    done: boolean("done").notNull().default(false),
  },
  (table) => [index("agenda_scheduled_on").on(table.scheduledOn)],
);

/** What a published piece brought. Filled by hand in the demo; by the networks once they are connected. */
export const pieceResults = pgTable("piece_results", {
  pieceId: integer("piece_id").primaryKey().references(() => pieces.id),
  clicks: integer("clicks").notNull().default(0),
  leads: integer("leads").notNull().default(0),
});

/** What a person must decide. Nothing leaves review without one of these resolved. */
export const approvals = pgTable(
  "approvals",
  {
    id: serial("id").primaryKey(),
    pieceId: integer("piece_id").notNull().references(() => pieces.id),
    agent: text("agent").notNull(),
    status: text("status").notNull().default("pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [index("approvals_status").on(table.status)],
);

/** The owner of this Nexopix: one row, edited from Profile and settings. */
export const ownerProfile = pgTable("owner_profile", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  company: text("company").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * What happened to a piece, in order: who acted (gatekeeper, router, an agent or the person), what they did and when.
 * Never edited or deleted: it is the trace another system reads through the API.
 */
export const pieceEvents = pgTable(
  "piece_events",
  {
    id: serial("id").primaryKey(),
    pieceId: integer("piece_id").notNull().references(() => pieces.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor").notNull(),
    type: text("type").notNull(),
    detail: jsonb("detail").$type<Record<string, string | number | boolean | null>>(),
    /** The trace id of the system that caused it (x-trace-id), to follow one request across systems. */
    traceId: text("trace_id"),
  },
  (table) => [index("piece_events_piece").on(table.pieceId, table.at)],
);
