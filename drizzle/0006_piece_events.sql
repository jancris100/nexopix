CREATE TABLE "piece_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"piece_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"type" text NOT NULL,
	"detail" jsonb,
	"trace_id" text
);
--> statement-breakpoint
ALTER TABLE "piece_events" ADD CONSTRAINT "piece_events_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "piece_events_piece" ON "piece_events" USING btree ("piece_id","at");--> statement-breakpoint
-- Pieces made before the trace existed get what is known of them: when they came in, where they were routed and
-- the stage they are at now. backfilled marks these rows.
INSERT INTO "piece_events" ("piece_id", "at", "actor", "type", "detail")
SELECT "id", "created_at", 'gatekeeper', 'received', jsonb_build_object('source', "origin", 'reference', "external_ref", 'backfilled', true) FROM "pieces";--> statement-breakpoint
INSERT INTO "piece_events" ("piece_id", "at", "actor", "type", "detail")
SELECT "id", "created_at", 'router', 'routed', jsonb_build_object('pipeline', "pipeline", 'format', "format", 'backfilled', true) FROM "pieces";--> statement-breakpoint
INSERT INTO "piece_events" ("piece_id", "at", "actor", "type", "detail")
SELECT "id", "created_at", 'router', 'advanced', jsonb_build_object('to', "stage", 'backfilled', true) FROM "pieces" WHERE "stage" > 0;
