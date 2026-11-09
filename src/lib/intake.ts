import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { intakeLog } from "../db/schema";

export type IntakeOutcome = "accepted" | "repeated" | "refused";

const short = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

/** Writes one entry of the gatekeeper's log. Never stops a request: a failure is only logged. */
export async function recordIntake(entry: {
  outcome: IntakeOutcome;
  body: Record<string, unknown> | null;
  code?: string | null;
  params?: Record<string, string | number> | null;
  pieceId?: number | null;
  traceId?: string | null;
}) {
  try {
    const body = entry.body ?? {};
    const db = await getDb();
    await db.insert(intakeLog).values({
      outcome: entry.outcome,
      source: short(body.source, 40),
      reference: short(body.reference, 120),
      account: short(body.account, 80),
      network: short(body.network, 20),
      format: short(body.format, 20),
      goal: short(body.goal, 120),
      code: entry.code ?? null,
      params: entry.params ?? null,
      pieceId: entry.pieceId ?? null,
      traceId: entry.traceId ?? null,
    });
  } catch (error) {
    console.error("Intake log failed", error instanceof Error ? error.message : error);
  }
}

/** The newest entries, all or of one outcome. */
export async function listIntake(outcome?: IntakeOutcome, limit = 100) {
  const db = await getDb();
  const query = db.select().from(intakeLog);
  const rows = await (outcome ? query.where(eq(intakeLog.outcome, outcome)) : query).orderBy(desc(intakeLog.at), desc(intakeLog.id)).limit(Math.min(limit, 200));
  return rows.map((row) => ({ ...row, at: row.at.toISOString() }));
}
