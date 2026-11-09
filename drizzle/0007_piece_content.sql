CREATE TABLE "piece_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"piece_id" integer NOT NULL,
	"version" integer NOT NULL,
	"idea" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"hashtags" text DEFAULT '' NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "piece_id" integer;--> statement-breakpoint
ALTER TABLE "pieces" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pieces" ADD COLUMN "external_media_id" text;--> statement-breakpoint
ALTER TABLE "piece_versions" ADD CONSTRAINT "piece_versions_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "piece_versions_piece_version" ON "piece_versions" USING btree ("piece_id","version");--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Every piece made before versions existed starts with version 1: its goal and notes as the idea, its files as media.
INSERT INTO "piece_versions" ("piece_id", "version", "idea", "media", "author", "note")
SELECT "id", 1, "title" || COALESCE(E'\n' || ("brief"->>'notes'), ''), COALESCE("brief"->'media', '[]'::jsonb), 'router', 'backfilled' FROM "pieces";
