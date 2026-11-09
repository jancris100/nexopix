CREATE TABLE "intake_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"source" text,
	"reference" text,
	"account" text,
	"network" text,
	"format" text,
	"goal" text,
	"code" text,
	"params" jsonb,
	"piece_id" integer,
	"trace_id" text
);
--> statement-breakpoint
ALTER TABLE "intake_log" ADD CONSTRAINT "intake_log_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_log_at" ON "intake_log" USING btree ("at");--> statement-breakpoint
-- Requests that came in through the API before the log existed: all of them were accepted.
INSERT INTO "intake_log" ("at", "outcome", "source", "reference", "account", "network", "format", "goal", "piece_id")
SELECT p."created_at", 'accepted', p."origin", p."external_ref", a."handle", a."network", p."format", p."title", p."id"
FROM "pieces" p JOIN "accounts" a ON a."id" = p."account_id" WHERE p."origin" IS NOT NULL;
